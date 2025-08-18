import { describe, it, expect, beforeEach } from 'vitest';
import { parseBoolean, parseString, parseArray, parseItems, loadFields } from '../src/parser';
import type { JsonSchemaProperty, VueInstance, FormField } from '../src/types';

// Mock Vue instance for testing
const createMockVueInstance = (value: Record<string, unknown> = {}): VueInstance => {
  return {
    value,
    fields: {},
    $set: (obj: Record<string, unknown>, key: string, val: unknown) => {
      obj[key] = val;
    },
  } as VueInstance;
};

describe('parser', () => {
  describe('parseBoolean', () => {
    let vm: VueInstance;

    beforeEach(() => {
      vm = createMockVueInstance();
    });

    it('should parse boolean schema with default values', () => {
      const schema: JsonSchemaProperty = {
        type: 'boolean',
        title: 'Test Boolean',
        description: 'Test description',
      };
      
      const result = parseBoolean(vm, schema, 'testField');
      
      expect(result.type).toBe('checkbox');
      expect(result.label).toBe('Test Boolean');
      expect(result.description).toBe('Test description');
      expect(result.name).toBe('testField');
      expect(result.checked).toBe(false);
    });

    it('should use custom type when provided', () => {
      const schema: JsonSchemaProperty = {
        type: 'boolean',
        attrs: { type: 'radio' },
      };
      
      const result = parseBoolean(vm, schema, 'testField');
      
      expect(result.type).toBe('radio');
    });

    it('should handle checked property', () => {
      const schema: JsonSchemaProperty = {
        type: 'boolean',
        checked: true,
      };
      
      const result = parseBoolean(vm, schema, 'testField');
      
      expect(result.checked).toBe(true);
    });

    it('should handle default value', () => {
      const schema: JsonSchemaProperty = {
        type: 'boolean',
        default: true,
      };
      
      const result = parseBoolean(vm, schema, 'testField');
      
      expect(result.value).toBe(true);
    });

    it('should handle required and disabled properties', () => {
      const schema: JsonSchemaProperty = {
        type: 'boolean',
        required: true,
        disabled: true,
      };
      
      const result = parseBoolean(vm, schema, 'testField');
      
      expect(result.required).toBe(true);
      expect(result.disabled).toBe(true);
    });
  });

  describe('parseString', () => {
    let vm: VueInstance;

    beforeEach(() => {
      vm = createMockVueInstance();
    });

    it('should parse string schema with default type', () => {
      const schema: JsonSchemaProperty = {
        type: 'string',
        title: 'Test String',
      };
      
      const result = parseString(vm, schema, 'testField');
      
      expect(result.type).toBe('text');
      expect(result.label).toBe('Test String');
      expect(result.name).toBe('testField');
    });

    it('should handle email format', () => {
      const schema: JsonSchemaProperty = {
        type: 'string',
        format: 'email',
      };
      
      const result = parseString(vm, schema, 'testField');
      
      expect(result.type).toBe('email');
    });

    it('should handle uri format', () => {
      const schema: JsonSchemaProperty = {
        type: 'string',
        format: 'uri',
      };
      
      const result = parseString(vm, schema, 'testField');
      
      expect(result.type).toBe('url');
    });

    it('should handle regex format', () => {
      const schema: JsonSchemaProperty = {
        type: 'string',
        format: 'regex',
        pattern: '^[a-z]+$',
      };
      
      const result = parseString(vm, schema, 'testField');
      
      expect(result.type).toBe('text');
      expect(result.pattern).toBe('^[a-z]+$');
    });

    it('should handle number type', () => {
      const schema: JsonSchemaProperty = {
        type: 'number',
      };
      
      const result = parseString(vm, schema, 'testField');
      
      expect(result.type).toBe('number');
    });

    it('should handle integer type', () => {
      const schema: JsonSchemaProperty = {
        type: 'integer',
      };
      
      const result = parseString(vm, schema, 'testField');
      
      expect(result.type).toBe('number');
    });

    it('should handle minLength and maxLength', () => {
      const schema: JsonSchemaProperty = {
        type: 'string',
        minLength: 5,
        maxLength: 20,
      };
      
      const result = parseString(vm, schema, 'testField');
      
      expect(result.minlength).toBe(5);
      expect(result.maxlength).toBe(20);
    });

    it('should preserve custom type when provided', () => {
      const schema: JsonSchemaProperty = {
        type: 'string',
        format: 'email',
        attrs: { type: 'password' },
      };
      
      const result = parseString(vm, schema, 'testField');
      
      expect(result.type).toBe('password');
    });
  });

  describe('parseItems', () => {
    it('should parse simple string items', () => {
      const items = ['option1', 'option2', 'option3'];
      
      const result = parseItems(items);
      
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ value: 'option1', label: 'option1' });
      expect(result[1]).toEqual({ value: 'option2', label: 'option2' });
      expect(result[2]).toEqual({ value: 'option3', label: 'option3' });
    });

    it('should parse number items', () => {
      const items = [1, 2, 3];
      
      const result = parseItems(items);
      
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ value: 1, label: '1' });
      expect(result[1]).toEqual({ value: 2, label: '2' });
      expect(result[2]).toEqual({ value: 3, label: '3' });
    });

    it('should preserve object items', () => {
      const items = [
        { value: 'val1', label: 'Label 1' },
        { value: 'val2', label: 'Label 2' },
      ];
      
      const result = parseItems(items);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ value: 'val1', label: 'Label 1' });
      expect(result[1]).toEqual({ value: 'val2', label: 'Label 2' });
    });

    it('should handle mixed types', () => {
      const items = ['string', 42, { value: 'obj', label: 'Object' }, null];
      
      const result = parseItems(items);
      
      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({ value: 'string', label: 'string' });
      expect(result[1]).toEqual({ value: 42, label: '42' });
      expect(result[2]).toEqual({ value: 'obj', label: 'Object' });
      expect(result[3]).toEqual({ value: null, label: 'null' });
    });
  });

  describe('parseArray', () => {
    let vm: VueInstance;

    beforeEach(() => {
      vm = createMockVueInstance();
    });

    it('should parse enum array as select', () => {
      const schema: JsonSchemaProperty = {
        type: 'array',
        enum: ['option1', 'option2', 'option3'],
      };
      
      const result = parseArray(vm, schema, 'testField');
      
      expect(result.type).toBe('select');
      expect(result.items).toHaveLength(3);
      expect(result.items[0]).toEqual({ value: 'option1', label: 'option1' });
    });

    it('should parse oneOf array as radio', () => {
      const schema: JsonSchemaProperty = {
        type: 'array',
        oneOf: ['radio1', 'radio2'],
      };
      
      const result = parseArray(vm, schema, 'testField');
      
      expect(result.type).toBe('radio');
      expect(result.items).toHaveLength(2);
      expect(result.value).toBe('');
    });

    it('should parse anyOf array as checkbox', () => {
      const schema: JsonSchemaProperty = {
        type: 'array',
        anyOf: ['check1', 'check2'],
      };
      
      const result = parseArray(vm, schema, 'testField');
      
      expect(result.type).toBe('checkbox');
      expect(result.items).toHaveLength(2);
      expect(Array.isArray(result.value)).toBe(true);
    });

    it('should handle multiple items', () => {
      const schema: JsonSchemaProperty = {
        type: 'array',
        minItems: 2,
        enum: ['opt1', 'opt2'],
      };
      
      const result = parseArray(vm, schema, 'testField');
      
      expect(result.multiple).toBe(true);
    });

    it('should use schema type when no keywords present', () => {
      const schema: JsonSchemaProperty = {
        type: 'array',
      };
      
      const result = parseArray(vm, schema, 'testField');
      
      expect(result.type).toBe('array');
      expect(Array.isArray(result.value)).toBe(true);
      expect(result.items).toEqual([]);
    });

    it('should preserve custom type when provided', () => {
      const schema: JsonSchemaProperty = {
        type: 'array',
        enum: ['opt1', 'opt2'],
        attrs: { type: 'custom' },
      };
      
      const result = parseArray(vm, schema, 'testField');
      
      expect(result.type).toBe('custom');
    });
  });

  describe('loadFields', () => {
    let vm: VueInstance;

    beforeEach(() => {
      vm = createMockVueInstance();
      vm.fields = {};
    });

    it('should skip invisible fields', () => {
      const schema: JsonSchemaProperty = {
        type: 'string',
        visible: false,
      };
      
      loadFields(vm, schema);
      
      expect(Object.keys(vm.fields)).toHaveLength(0);
    });

    it('should load string field', () => {
      const schema: JsonSchemaProperty = {
        type: 'string',
        name: 'testField',
        title: 'Test Field',
      };
      
      loadFields(vm, schema);
      
      expect(vm.fields.testField).toBeDefined();
      expect(vm.fields.testField.type).toBe('text');
      expect(vm.fields.testField.label).toBe('Test Field');
    });

    it('should load boolean field', () => {
      const schema: JsonSchemaProperty = {
        type: 'boolean',
        name: 'boolField',
      };
      
      loadFields(vm, schema);
      
      expect(vm.fields.boolField).toBeDefined();
      expect(vm.fields.boolField.type).toBe('checkbox');
    });

    it('should load array field', () => {
      const schema: JsonSchemaProperty = {
        type: 'array',
        name: 'arrayField',
        enum: ['opt1', 'opt2'],
      };
      
      loadFields(vm, schema);
      
      expect(vm.fields.arrayField).toBeDefined();
      expect(vm.fields.arrayField.type).toBe('select');
    });

    it('should handle object type with properties', () => {
      const schema: JsonSchemaProperty = {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            title: 'Name',
          },
          age: {
            type: 'number',
            title: 'Age',
          },
        },
      };
      
      loadFields(vm, schema);
      
      expect(vm.fields.name).toBeDefined();
      expect(vm.fields.age).toBeDefined();
      expect(vm.fields.name.type).toBe('text');
      expect(vm.fields.age.type).toBe('number');
    });
  });
});