import { describe, expect, it } from 'vitest';
import { loadFields, parseArray, parseBoolean, parseSchema, parseString } from '../src/parser';
import { deepClone, setVal } from '../src/utils';
import type { JsonSchema } from '../src/types';

function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

describe('schema parsing contract', () => {
  const schema: JsonSchema = {
    type: 'object', required: ['profile'],
    properties: {
      profile: {
        type: 'object', required: ['name'],
        properties: { name: { type: 'string', attrs: { placeholder: 'Name', style: { color: 'red' } } } },
      },
      rows: { type: 'array', default: [{ value: 'initial' }], items: {
        type: 'object', properties: { value: { type: 'string' } },
      } },
    },
  };

  it('accepts deeply frozen schemas and retains nested required lists', () => {
    const input = freeze(deepClone(schema));
    const fields: Record<string, any> = {};
    loadFields({}, input, fields);
    expect(fields.profile['profile.name'].required).toBe(true);
    expect(input).toEqual(schema);
    expect(input.properties?.profile.required).toEqual(['name']);
    expect(input.properties?.profile.name).toBeUndefined();
  });

  it('isolates attrs, item schemas and defaults across parses', () => {
    const first = parseSchema(schema);
    const second = parseSchema(schema);
    first.fields.profile['profile.name'].style.color = 'blue';
    first.fields.rows.itemsSchema.properties.value.title = 'Changed';
    first.model.rows[0].value = 'Changed';
    expect(second.model.rows).toEqual([{ value: 'initial' }]);
    expect(second.fields.profile['profile.name'].style.color).toBe('red');
    expect(schema.properties?.rows.items?.properties?.value.title).toBeUndefined();
  });

  it('does not change the model passed to parseSchema', () => {
    const initial = freeze({ profile: { name: 'Ada' } });
    const { model } = parseSchema(schema, initial);
    model.profile.name = 'Grace';
    expect(initial).toEqual({ profile: { name: 'Ada' } });
    expect(model.rows).toEqual([{ value: 'initial' }]);
  });

  it('supports both loadFields signatures without confusing model keys for a VM', () => {
    const vm = { value: {}, fields: {} };
    loadFields(vm, schema);
    expect(vm.fields).toHaveProperty('profile');
    const model = { value: 'user value', fields: 'user fields' };
    const fields = {};
    loadFields(model, schema, fields);
    expect(model.value).toBe('user value');
    expect(fields).toHaveProperty('rows');
  });

  it('recomputes required metadata after schema edits without sticky mutations', () => {
    const changing: JsonSchema = { type: 'object', required: ['name'], properties: { name: { type: 'string' } } };
    expect(parseSchema(changing).fields.name.required).toBe(true);
    changing.required = [];
    expect(parseSchema(changing).fields.name.required).toBe(false);
  });

  it.each([parseString, parseBoolean, parseArray])('direct parsers leave frozen attrs unchanged', (parse) => {
    const input = freeze({ type: 'string', attrs: { class: 'custom' }, default: false });
    expect(() => parse({}, input, 'field')).not.toThrow();
    expect(input.attrs).toEqual({ class: 'custom' });
  });

  it('preserves false and zero enum defaults, zero constraints and nested array defaults', () => {
    const result = parseSchema({ type: 'object', properties: {
      count: { type: 'integer', enum: [0, 1], default: 0 },
      active: { type: 'boolean', enum: [false, true], default: false },
      empty: { type: 'string', maxLength: 0 },
      group: { type: 'object', properties: { rows: schema.properties!.rows } },
    } });
    expect(result.model.count).toBe(0);
    expect(result.model.active).toBe(false);
    expect(result.fields.empty.maxlength).toBe(0);
    expect(result.model.group.rows).toEqual([{ value: 'initial' }]);
  });

  it('does not consume path arrays or allow prototype traversal', () => {
    const path = ['group', 'name'];
    const model = {};
    setVal(model, path, 'Ada');
    expect(path).toEqual(['group', 'name']);
    expect(() => setVal({}, ['__proto__', 'polluted'], true)).toThrow('Unsafe field path');
    expect(() => setVal({}, ['constructor', 'prototype', 'polluted'], true)).toThrow();
    const cloned = deepClone(JSON.parse('{"__proto__":{"polluted":true}}'));
    expect(Object.getPrototypeOf(cloned)).toBe(Object.prototype);
    expect(({} as any).polluted).toBeUndefined();
  });
});
