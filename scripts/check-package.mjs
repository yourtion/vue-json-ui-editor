import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import Editor, { createArrayRenderer } from 'vue-json-ui-editor';

assert.equal(typeof Editor.setComponent, 'function');
assert.equal(typeof createArrayRenderer, 'function');
const cjs = createRequire(import.meta.url)('vue-json-ui-editor');
assert.equal(typeof cjs.default.setComponent, 'function');
assert.equal(typeof cjs.createArrayRenderer, 'function');
assert.ok(existsSync(new URL('../dist/types/static.d.ts', import.meta.url)));
console.log('ESM, CommonJS and declaration entry checks passed.');
