import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { lstatSync, readFileSync, writeFileSync, renameSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { resolve, relative, dirname, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { baselineInputs } from './baseline-inputs.mjs';
const self = fileURLToPath(import.meta.url);
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');

export function runMutation({ cwd = process.cwd(), configFile, reportFile, command = process.execPath, args = [], force = false } = {}) {
  if (!reportFile || !command || !Array.isArray(args)) throw new Error('需要 reportFile、command 和 args');
  const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd, encoding: 'utf8' }).trim();
  const report = resolve(cwd, reportFile), sidecar = `${report}.inputs.json`;
  const rel = relative(root, report);
  if (!rel || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel) || rel === configFile) throw new Error('报告必须位于目标Git工作区内的独立路径');
  // A report must never overwrite a tracked input or traverse symlinked output directories.
  const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root }).toString().split('\0');
  for (const path of [report, sidecar]) {
    if (tracked.includes(relative(root, path))) throw new Error('报告/sidecar不能是Git跟踪输入');
    let cursor = path;
    while (cursor !== root) {
      if (existsSync(cursor) && lstatSync(cursor).isSymbolicLink()) throw new Error('报告路径不能包含符号链接');
      cursor = dirname(cursor);
    }
  }
  if (args.some((arg) => /^--(?:incrementalFile|incremental-file|no-incremental)(?:=|$)/.test(arg) || /^--incremental(?:=|$)/.test(arg))) {
    throw new Error('请通过受跟踪配置设置incremental/incrementalFile，不能用CLI覆盖报告路径或禁用报告');
  }
  const invocationDigest = sha(JSON.stringify({ command, args: args.filter((arg) => arg !== '--force') }));
  const current = baselineInputs({ cwd, configFile });
  let decision = 'missing-or-invalid-baseline';
  try {
    const bytes = readFileSync(report), previous = JSON.parse(readFileSync(sidecar, 'utf8')), result = JSON.parse(bytes);
    if (previous.schema === 3 && previous.reportDigest === sha(bytes) && previous.wrapperDigest === sha(readFileSync(self)) && previous.invocationDigest === invocationDigest
      && result.files && typeof result.files === 'object' && !Array.isArray(result.files)) {
      decision = previous.semanticHash === current.semanticHash ? 'same-semantic-inputs' : 'semantic-inputs-changed';
    }
  } catch { /* Missing, interrupted or legacy reports are deliberately not trusted. */ }
  if (force || process.env.FORCE_FULL === 'true' || args.includes('--force')) decision = 'explicit-full';
  const reuse = decision === 'same-semantic-inputs';
  console.log(JSON.stringify({ action: reuse ? 'incremental' : 'full', reason: decision, compatibilityHash: current.hash }));
  if (!reuse) { rmSync(report, { force: true }); rmSync(sidecar, { force: true }); }
  // A failed/interrupted invocation must not leave a valid authorization sidecar.
  rmSync(sidecar, { force: true });
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) return result.status ?? 1;
  const bytes = readFileSync(report), parsed = JSON.parse(bytes);
  if (!parsed.files || typeof parsed.files !== 'object' || Array.isArray(parsed.files)) throw new Error('命令未生成有效的Stryker增量报告');
  const after = baselineInputs({ cwd, configFile });
  if (after.semanticHash !== current.semanticHash) throw new Error('运行期间语义输入发生变化，拒绝授权复用');
  mkdirSync(dirname(sidecar), { recursive: true });
  const temporary = `${sidecar}.${process.pid}.tmp`;
  writeFileSync(temporary, JSON.stringify({ ...current, reportDigest: sha(bytes), wrapperDigest: sha(readFileSync(self)), invocationDigest }, null, 2));
  renameSync(temporary, sidecar);
  return 0;
}
if (process.argv[1] && resolve(process.argv[1]) === self) {
  try {
    const [configFile, reportFile, separator, command, ...args] = process.argv.slice(2);
    if (!configFile || !reportFile || separator !== '--' || !command) throw new Error('用法：node run-mutation.mjs <策略.json> <报告.json> -- <命令> [参数]');
    process.exitCode = runMutation({ configFile, reportFile, command, args });
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
