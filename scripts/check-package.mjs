import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import Editor, { inspectSchema, parseSchema } from 'vue-json-ui-editor';

assert.equal(typeof Editor.setComponent, 'function');
const schema = { type: 'object', properties: { limit: { type: 'integer', default: 0 } } };
assert.equal(inspectSchema(schema).supported, true);
assert.equal(parseSchema(schema).model.limit, 0);
const cjs = createRequire(import.meta.url)('vue-json-ui-editor');
assert.equal(typeof cjs.default.setComponent, 'function');
assert.equal(typeof cjs.inspectSchema, 'function');
assert.equal(cjs.parseSchema(schema).model.limit, 0);
assert.ok(existsSync(new URL('../dist/types/static.d.ts', import.meta.url)));
console.log('ESM, CommonJS and declaration entry checks passed.');
