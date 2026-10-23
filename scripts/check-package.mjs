import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  closeSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const tsc = require.resolve('typescript/bin/tsc');
// npm_execpath points to pnpm when invoked through pnpm; packaging uses npm CLI.
const npm = 'npm';
const fixture = mkdtempSync(join(tmpdir(), 'vue-json-ui-editor-consumers-'));
let commandId = 0;

function capture(args, cwd = fixture) {
  const log = join(fixture, `command-${commandId++}`);
  const stdout = openSync(`${log}.out`, 'w');
  const stderr = openSync(`${log}.err`, 'w');
  let result;
  try {
    const command = args[0] === npm ? npm : process.execPath;
    const commandArgs = args[0] === npm ? args.slice(1) : args;
    result = spawnSync(command, commandArgs, { cwd, stdio: ['ignore', stdout, stderr] });
  } finally {
    closeSync(stdout);
    closeSync(stderr);
  }
  if (result.error) throw result.error;
  const output = readFileSync(`${log}.out`, 'utf8');
  if (result.status !== 0) {
    const error = new Error(`Command failed (${result.status}): ${args.join(' ')}`);
    error.stdout = output;
    error.stderr = readFileSync(`${log}.err`, 'utf8');
    throw error;
  }
  return output;
}

try {
  // Install the real tarball, never source files or workspace symlinks.
  const supplied = process.argv[2];
  const tarball = supplied ? resolve(supplied) : (() => {
    const [pack] = JSON.parse(capture([
      npm, 'pack', '--json', '--ignore-scripts', '--cache', join(fixture, 'npm-cache'),
      '--pack-destination', fixture,
    ], root));
    return join(fixture, pack.filename);
  })();
  writeFileSync(join(fixture, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
  capture([npm, 'install', '--ignore-scripts', '--no-audit', '--no-fund',
    '--package-lock=false', '--cache', join(fixture, 'npm-cache'),
    '--registry=https://registry.npmjs.org/', tarball]);
  writeFileSync(join(fixture, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
  const consumer = readFileSync(join(root, 'scripts/fixtures/package-consumer.ts'), 'utf8');
  const cjs = readFileSync(join(root, 'scripts/fixtures/package-consumer.cts'), 'utf8');
  for (const ext of ['ts', 'mts', 'cts']) {
    writeFileSync(join(fixture, `consumer.${ext}`), consumer + (ext === 'cts' ? `\n${cjs}` : ''));
  }
  const cases = [
    { name: 'bundler', module: 'ESNext', moduleResolution: 'Bundler', ext: 'ts' },
    ...['NodeNext', 'Node16'].flatMap(mode => ['mts', 'cts'].map(ext => ({
      name: `${mode}-${ext}`, module: mode, moduleResolution: mode, ext,
    }))),
  ];
  const failures = [];
  for (const test of cases) {
    const config = join(fixture, `tsconfig.${test.name}.json`);
    writeFileSync(config, JSON.stringify({
      compilerOptions: {
        module: test.module, moduleResolution: test.moduleResolution, target: 'ES2022',
        lib: ['ES2022', 'DOM'], strict: true, noEmit: true, skipLibCheck: false,
        esModuleInterop: true, types: [],
      },
      files: [`consumer.${test.ext}`],
    }));
    try {
      capture([tsc, '--project', config]);
      console.log(`${test.name}: passed`);
    } catch (error) {
      failures.push(test.name);
      console.error(`${test.name}: failed\n${error.stdout || ''}${error.stderr || ''}`);
    }
  }
  assert.deepEqual(failures, [], 'All declaration-consumer modes must pass.');

  const runtime = `assert.equal(typeof Editor.setComponent, 'function');\nassert.equal(typeof createArrayRenderer, 'function');`;
  writeFileSync(join(fixture, 'runtime.mjs'), `import assert from 'node:assert/strict';\nimport Editor, { createArrayRenderer } from 'vue-json-ui-editor';\n${runtime}\n`);
  writeFileSync(join(fixture, 'runtime.cjs'), `const assert = require('node:assert/strict');\nconst { default: Editor, createArrayRenderer } = require('vue-json-ui-editor');\n${runtime}\n`);
  for (const file of ['runtime.mjs', 'runtime.cjs']) {
    execFileSync(process.execPath, [resolve(fixture, file)], { stdio: 'inherit' });
  }
  console.log('Isolated package ESM/CommonJS runtime checks passed.');
} finally {
  rmSync(fixture, { recursive: true, force: true });
}
