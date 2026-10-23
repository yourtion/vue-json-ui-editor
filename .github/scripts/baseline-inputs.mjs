import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync } from 'node:fs';
import { isAbsolute, posix, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptFile = fileURLToPath(import.meta.url);
const digest = (value) => createHash('sha256').update(value).digest('hex');
const sourceFile = /\.(?:[cm]?[jt]sx?)$/;
const declarationFile = /\.d\.[cm]?ts$/;

function patterns(value, name) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || !item.trim()
    || item.startsWith('!') || item.startsWith('/') || item.includes('\\') || item.split('/').includes('..'))) {
    throw new Error(`${name} 必须是仓库相对的正向 glob 数组（使用 /，不支持 ! 或 ..）`);
  }
  return value;
}

// Hash checked-out contents, not index blobs: local edits must affect the result.
// Start from all tracked files so newly committed helpers cannot be omitted.
export function baselineInputs({ cwd = process.cwd(), configFile } = {}) {
  if (typeof configFile !== 'string' || !configFile) throw new Error('必须提供缓存输入配置路径');
  const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8' }).trim();
  const configPath = resolve(root, configFile);
  const configRelative = relative(root, configPath);
  if (configRelative === '..' || configRelative.startsWith('../') || configRelative.startsWith('..\\') || isAbsolute(configRelative)) {
    throw new Error('缓存输入配置必须位于目标 Git 仓库内');
  }
  if (!lstatSync(configPath).isFile()) throw new Error('缓存输入配置必须是普通文件');
  const configBytes = readFileSync(configPath);
  const config = JSON.parse(configBytes);
  if (!config || Array.isArray(config) || typeof config !== 'object'
    || Object.keys(config).some((key) => !['trackedByStryker', 'alwaysHash'].includes(key))) {
    throw new Error('缓存输入配置仅支持 trackedByStryker 和 alwaysHash');
  }
  const tracked = patterns(config.trackedByStryker, 'trackedByStryker');
  const always = patterns(config.alwaysHash === undefined ? [] : config.alwaysHash, 'alwaysHash');
  const output = execFileSync('git', ['ls-files', '--cached', '--deduplicate', '-z'], { cwd: root, maxBuffer: 32 * 1024 * 1024 });
  const files = new TextDecoder('utf-8', { fatal: true }).decode(output).split('\0').filter(Boolean).sort();
  const hashedFiles = [];
  const strykerTrackedFiles = [];
  const hash = createHash('sha256');
  // The policy and this implementation always invalidate the key on changes,
  // even before a copied helper/config is staged in the target repository.
  hash.update(`mutation-inputs-v1\n${digest(configBytes)}\n${digest(readFileSync(scriptFile))}\n`);
  for (const file of files) {
    const absolute = resolve(root, file);
    const stat = lstatSync(absolute);
    if (!stat.isFile()) throw new Error(`无法自动追踪符号链接或子模块输入：${JSON.stringify(file)}`);
    const canTrack = sourceFile.test(file) && !declarationFile.test(file)
      && absolute !== configPath && absolute !== scriptFile;
    if (canTrack && tracked.some((pattern) => posix.matchesGlob(file, pattern))
      && !always.some((pattern) => posix.matchesGlob(file, pattern))) {
      strykerTrackedFiles.push(file);
      continue;
    }
    hashedFiles.push(file);
    hash.update(`${JSON.stringify([file, stat.mode & 0o111, digest(readFileSync(absolute))])}\n`);
  }
  if (hashedFiles.length === 0) throw new Error('缓存输入清单为空，拒绝生成兼容性键');
  return { hash: hash.digest('hex'), hashedFiles, strykerTrackedFiles };
}

if (process.argv[1] && resolve(process.argv[1]) === scriptFile) {
  try {
    const [configFile, option, ...extra] = process.argv.slice(2);
    if (!configFile || (option !== undefined && option !== '--list') || extra.length) {
      throw new Error('用法：node baseline-inputs.mjs <仓库相对配置.json> [--list]');
    }
    const result = baselineInputs({ configFile });
    console.log(option === '--list' ? JSON.stringify(result, null, 2) : result.hash);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
