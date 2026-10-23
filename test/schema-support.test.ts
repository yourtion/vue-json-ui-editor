import { describe, expect, it } from 'vitest';
import { inspectSchema } from '../src/schema-support';

describe('JSON Schema rendering support', () => {
  it('accepts the documented subset without changing it', () => {
    const schema = Object.freeze({ type: 'object', additionalProperties: false, required: ['count'], properties: {
      count: { type: 'integer', minimum: 0, maximum: 10, multipleOf: 2 },
      items: { type: 'array', minItems: 0, items: { type: 'object', properties: { name: { type: 'string' } } } },
    } });
    expect(inspectSchema(schema)).toEqual({ supported: true, issues: [] });
  });

  it.each([
    [{ $ref: '#/$defs/name' }, '$ref'],
    [{ type: ['string', 'null'] }, 'type'],
    [{ type: 'string', oneOf: [{ const: 'a' }, { const: 'b' }] }, 'oneOf'],
    [{ type: 'string', anyOf: ['a', 'b'] }, 'anyOf'],
    [{ type: 'array', items: { type: 'string' } }, 'items'],
    [{ type: 'array', items: [{ type: 'string' }] }, 'items'],
    [{ type: 'object', properties: {}, additionalProperties: { type: 'string' } }, 'additionalProperties'],
    [{ type: 'object', properties: {}, patternProperties: { '^x': { type: 'string' } } }, 'patternProperties'],
    [{ type: 'string', enum: [{ value: 'a', label: 'A' }] }, 'enum'],
    [{ type: 'string', required: true }, 'required'],
    [{ type: 'string', customUnknown: true }, 'customUnknown'],
    [true, 'schema'],
  ])('reports unsupported constructs with schema paths', (property, keyword) => {
    const result = inspectSchema({ type: 'object', properties: { 'a/b~': property } });
    expect(result.supported).toBe(false);
    expect(result.issues.some(issue => issue.keyword === keyword && issue.path.startsWith('#/properties/a~1b~0'))).toBe(true);
  });

  it.each(['a.b', '$sub', '__proto__', 'constructor', 'prototype', '', '42', '01'])('rejects unrepresentable property names: %s', name => {
    const schema = { type: 'object', properties: { [name]: { type: 'string' } } };
    expect(inspectSchema(schema).supported).toBe(false);
  });

  it('does not confuse shared schemas with cycles', () => {
    const child = { type: 'string' };
    expect(inspectSchema({ type: 'object', properties: { a: child, b: child } }).supported).toBe(true);
    const cyclic: any = { type: 'object', properties: {} };
    cyclic.properties.self = cyclic;
    expect(inspectSchema(cyclic).issues[0].message).toContain('Cyclic');
  });
});
