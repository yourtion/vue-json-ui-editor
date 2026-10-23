import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync, existsSync, realpathSync } from 'node:fs';
import { isAbsolute, posix, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { release } from 'node:os';

const scriptFile = fileURLToPath(import.meta.url);
const digest = (value) => createHash('sha256').update(value).digest('hex');
const canonical = (value) => JSON.stringify(value, (_, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.keys(item).sort().map((key) => [key, item[key]])) : item);
const fields = ['schema', 'trackedByStryker', 'alwaysHash', 'nonSemanticFiles', 'packageVersionFiles', 'npmLockVersionFiles', 'environment'];
const defaultEnvironment = ['CI', 'NODE_ENV', 'NODE_OPTIONS', 'TZ', 'LANG', 'LC_ALL', 'ISLIB', 'MUTATION_PROJECT', 'MUTATION_ENV_ID', 'ImageOS', 'ImageVersion'];

function repoPath(value) {
  return typeof value === 'string' && value.length > 0 && value.trim() === value
    && !isAbsolute(value) && !value.includes('\\') && !value.startsWith('!')
    && !value.split('/').some((part) => part === '..' || part === '.' || part === '');
}
function patterns(value, name) {
  if (!Array.isArray(value) || value.some((item) => !repoPath(item))) throw new Error(`${name} 必须是仓库相对正向 glob 数组`);
  return value;
}
function exemptions(value, name) {
  if (!Array.isArray(value) || value.some((item) => !item || typeof item !== 'object' || Array.isArray(item)
    || Object.keys(item).some((key) => !['path', 'reason'].includes(key)) || !repoPath(item.path)
    || /[*?{}[\]]/.test(item.path) || typeof item.reason !== 'string' || !item.reason.trim())) {
    throw new Error(`${name} 必须列出精确 path 和审核 reason，不能使用 glob`);
  }
  if (new Set(value.map((item) => item.path)).size !== value.length) throw new Error(`${name} 包含重复路径`);
  return new Map(value.map((item) => [item.path, item.reason]));
}
function regular(file) {
  if (!lstatSync(file).isFile()) throw new Error(`输入必须是普通文件，不能是符号链接或子模块：${file}`);
  return readFileSync(file);
}

// Compatibility locates a cache; semanticHash authorizes reuse, including source/tests.
// Never execute repository JS configuration while constructing the input manifest.
export function baselineInputs({ cwd = process.cwd(), configFile } = {}) {
  if (typeof configFile !== 'string' || !configFile) throw new Error('必须提供缓存输入配置路径');
  const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8' }).trim();
  if (!repoPath(configFile)) throw new Error('缓存输入配置必须位于目标 Git 仓库内');
  const configPath = resolve(root, configFile);
  const config = JSON.parse(regular(configPath));
  if (!config || Array.isArray(config) || config.schema !== 3 || Object.keys(config).some((key) => !fields.includes(key))) {
    throw new Error('缓存输入配置必须使用 schema: 3，未知字段拒绝复用');
  }
  const tracked = patterns(config.trackedByStryker, 'trackedByStryker');
  const always = patterns(config.alwaysHash, 'alwaysHash');
  const ignored = exemptions(config.nonSemanticFiles, 'nonSemanticFiles');
  const versions = exemptions(config.packageVersionFiles, 'packageVersionFiles');
  const lockVersions = exemptions(config.npmLockVersionFiles, 'npmLockVersionFiles');
  if (!Array.isArray(config.environment) || config.environment.some((name) => typeof name !== 'string'
    || !/^[A-Z][A-Z0-9_]*$/.test(name) || /SECRET|TOKEN|PASSWORD|PRIVATE_KEY|API_KEY/.test(name))) {
    throw new Error('environment 只能列出非秘密环境变量名');
  }
  for (const file of versions.keys()) if (posix.basename(file) !== 'package.json') throw new Error('版本规范化仅支持 package.json');
  for (const file of lockVersions.keys()) if (posix.basename(file) !== 'package-lock.json'
    || !versions.has(posix.join(posix.dirname(file), 'package.json'))) throw new Error('npm root 版本规范化需要相邻 package.json 的审核');
  const bytes = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '--deduplicate', '-z'], { cwd: root, maxBuffer: 32 * 1024 * 1024 });
  const files = [...new Set(new TextDecoder('utf-8', { fatal: true }).decode(bytes).split('\0').filter(Boolean))].sort();
  if (!files.length) throw new Error('缓存输入清单为空');
  const env = Object.fromEntries([...new Set([...defaultEnvironment, ...config.environment])].sort().map((key) => [key, process.env[key] ?? null]));
  const installed = [];
  // Lockfiles cover the resolved graph; record direct installed manifests too so local
  // dependency installation/removal is visible even if a manifest range is unchanged.
  for (const file of files.filter((file) => posix.basename(file) === 'package.json')) {
    if (!lstatSync(resolve(root, file), { throwIfNoEntry: false })) continue;
    const pkg = JSON.parse(regular(resolve(root, file)));
    const names = new Set(Object.keys({ ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies, ...pkg.optionalDependencies }));
    for (const name of [...names].sort()) {
      if (!/^(?:@[a-zA-Z0-9._-]+\/)?[a-zA-Z0-9._-]+$/.test(name)) throw new Error(`不支持的依赖名：${name}`);
      let directory = dirname(resolve(root, file));
      let content = null;
      while (true) {
        const candidate = resolve(directory, 'node_modules', name, 'package.json');
        if (existsSync(candidate)) {
          let installedBytes = readFileSync(candidate);
          // Workspace links can point back to an explicitly reviewed package.
          // Apply exactly the same root-version normalization, never by package name.
          const installedPath = relative(root, realpathSync(candidate)).split('\\').join('/');
          if (versions.has(installedPath)) {
            const installedPackage = JSON.parse(installedBytes); delete installedPackage.version;
            installedBytes = Buffer.from(canonical(installedPackage));
          }
          content = digest(installedBytes); break;
        }
        if (directory === root) break;
        const parent = dirname(directory);
        if (parent === directory || relative(root, parent).startsWith('..')) break;
        directory = parent;
      }
      installed.push([file, name, content]);
    }
  }
  const context = { schema: 3, config, implementation: digest(regular(scriptFile)), environment: env,
    runtime: { node: process.version, platform: process.platform, arch: process.arch, kernel: release() }, installed };
  const compatibilityRows = [], semanticRows = [], hashedFiles = [], strykerTrackedFiles = [], ignoredFiles = [], normalizedFiles = [];
  for (const file of files) {
    const absolute = resolve(root, file);
    const stat = lstatSync(absolute, { throwIfNoEntry: false });
    // Git still lists unstaged deletions. An absent path is the same input state
    // before and after staging its deletion; removing its prior row changes both hashes.
    if (!stat) continue;
    const protectedFile = absolute === configPath || absolute === scriptFile || always.some((pattern) => posix.matchesGlob(file, pattern));
    if (ignored.has(file)) {
      if (protectedFile || versions.has(file) || lockVersions.has(file)
        || /(?:^|\/)(?:package(?:-lock)?\.json|pnpm-lock\.yaml|yarn\.lock)$/.test(file)) throw new Error(`不能将受保护的语义输入标记为 nonSemantic：${file}`);
      if (!stat.isFile() && !stat.isSymbolicLink()) throw new Error(`不能忽略目录或子模块输入：${file}`);
      ignoredFiles.push(file); continue;
    }
    let content = regular(absolute);
    if (versions.has(file)) {
      const pkg = JSON.parse(content); delete pkg.version; content = Buffer.from(canonical(pkg)); normalizedFiles.push(file);
    }
    if (lockVersions.has(file)) {
      const lock = JSON.parse(content);
      const pkg = JSON.parse(regular(resolve(root, posix.dirname(file), 'package.json')));
      if (lock.lockfileVersion !== 3 || !lock.packages?.[''] || lock.version !== pkg.version || lock.packages[''].version !== pkg.version) {
        throw new Error(`仅支持与 package 匹配的 npm lockfile v3 root 版本：${file}`);
      }
      delete lock.version; delete lock.packages[''].version; content = Buffer.from(canonical(lock)); normalizedFiles.push(file);
    }
    const row = [file, stat.mode & 0o111, digest(content)]; semanticRows.push(row);
    const trackedSource = !protectedFile && /\.[cm]?[jt]sx?$/.test(file) && !/\.d\.[cm]?ts$/.test(file)
      && tracked.some((pattern) => posix.matchesGlob(file, pattern));
    if (trackedSource) strykerTrackedFiles.push(file);
    else { compatibilityRows.push(row); hashedFiles.push(file); }
  }
  return { schema: 3, hash: digest(canonical({ context, rows: compatibilityRows })),
    semanticHash: digest(canonical({ context, rows: semanticRows })), hashedFiles, strykerTrackedFiles, ignoredFiles, normalizedFiles };
}

if (process.argv[1] && resolve(process.argv[1]) === scriptFile) {
  try {
    const [configFile, option, ...extra] = process.argv.slice(2);
    if (!configFile || (option !== undefined && option !== '--list') || extra.length) throw new Error('用法：node baseline-inputs.mjs <策略.json> [--list]');
    const result = baselineInputs({ configFile });
    console.log(option === '--list' ? JSON.stringify(result, null, 2) : result.hash);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
