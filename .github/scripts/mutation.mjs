import { runMutation } from './run-mutation.mjs';

const args = process.argv.slice(2);
if (args.some((arg) => arg !== '--force')) {
  throw new Error('Only --force is supported here; use run-mutation.mjs with a separate report for scoped experiments.');
}
process.exitCode = runMutation({
  configFile: '.github/mutation-cache-inputs.json',
  reportFile: 'reports/stryker-incremental.json',
  command: process.execPath,
  args: ['node_modules/@stryker-mutator/core/bin/stryker.js', 'run', ...args],
});
