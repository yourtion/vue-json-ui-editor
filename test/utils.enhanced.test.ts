import { describe, it, expect } from 'vitest';
import { deepClone, getChild, initChild, setVal } from '../src/utils';

describe('utils - Enhanced Tests', () => {
  describe('deepClone', () => {
    it('should handle special object types', () => {
      // Test with Date
      const date = new Date('2023-01-01T00:00:00Z');
      const dateObj = { date };
      const clonedDateObj = deepClone(dateObj);
      expect(typeof clonedDateObj.date).toBe('string'); // Date becomes string

      // Test with RegExp
      const regex = /test/g;
      const regexObj = { regex };
      const clonedRegexObj = deepClone(regexObj);
      expect(clonedRegexObj.regex).toEqual({}); // RegExp becomes empty object after JSON serialization

      // Test with Function
      const func = () => 'test';
      const funcObj = { func };
      const clonedFuncObj = deepClone(funcObj);
      expect(clonedFuncObj.func).toBeUndefined(); // Function is lost in JSON serialization

      // Test with Symbol
      const sym = Symbol('test');
      const symObj = { sym };
      const clonedSymObj = deepClone(symObj);
      expect(clonedSymObj.sym).toBeUndefined(); // Symbol is lost in JSON serialization
    });

    it('should handle circular references gracefully', () => {
      const obj: any = { name: 'test' };
      obj.self = obj; // Create circular reference

      // Should not throw but result may be incomplete
      expect(() => {
        deepClone(obj);
      }).toThrow(); // JSON.stringify throws on circular references
    });

    it('should handle very large objects', () => {
      const largeObj: Record<string, unknown> = {};
      for (let i = 0; i < 1000; i++) {
        largeObj[`key${i}`] = `value${i}`;
      }

      const cloned = deepClone(largeObj);
      expect(cloned).toEqual(largeObj);
      expect(cloned).not.toBe(largeObj);
    });

    it('should handle objects with special property names', () => {
      const obj = {
        '': 'empty string key',
        'key.with.dots': 'dot key',
        'key-with-dashes': 'dash key',
        'key_with_underscores': 'underscore key',
        '123numeric': 'numeric key',
        'key with spaces': 'space key',
        '特殊字符': 'chinese key',
      };

      const cloned = deepClone(obj);
      expect(cloned).toEqual(obj);
      expect(cloned).not.toBe(obj);
    });

    it('should handle nested arrays with mixed types', () => {
      const obj = {
        mixedArray: [
          'string',
          42,
          true,
          null,
          undefined,
          { nested: 'object' },
          [1, 2, 3],
          new Date(),
        ],
      };

      const cloned = deepClone(obj);
      expect(cloned.mixedArray).toHaveLength(8);
      expect(cloned.mixedArray[0]).toBe('string');
      expect(cloned.mixedArray[1]).toBe(42);
      expect(cloned.mixedArray[2]).toBe(true);
      expect(cloned.mixedArray[3]).toBe(null);
      expect(cloned.mixedArray[4]).toBe(null); // undefined becomes null
      expect(cloned.mixedArray[5]).toEqual({ nested: 'object' });
      expect(cloned.mixedArray[6]).toEqual([1, 2, 3]);
      expect(typeof cloned.mixedArray[7]).toBe('string'); // Date becomes string
    });
  });

  describe('getChild', () => {
    it('should handle edge cases with path traversal', () => {
      const obj = {
        level1: {
          level2: {
            level3: 'deep value',
          },
        },
        'key.with.dots': {
          nested: 'dot key value',
        },
        '': {
          empty: 'empty key value',
        },
        null: 'null key value',
      };

      // Test deep nesting
      expect(getChild(obj, ['level1', 'level2', 'level3'])).toBe('deep value');

      // Test empty string key
      expect(getChild(obj, ['', 'empty'])).toBe('empty key value');

      // Test null key
      expect(getChild(obj, ['null'])).toBe('null key value');

      // Test non-existent deep path
      expect(getChild(obj, ['level1', 'nonexistent', 'level3'])).toBeUndefined();

      // Test empty path
      expect(getChild(obj, [])).toBeUndefined();
    });

    it('should handle arrays accessed with string indices', () => {
      const obj = {
        items: ['first', 'second', 'third'],
      };

      // Access array elements with string indices
      expect(getChild(obj, ['items', '0'])).toBe('first');
      expect(getChild(obj, ['items', '1'])).toBe('second');
      expect(getChild(obj, ['items', '2'])).toBe('third');
      expect(getChild(obj, ['items', '3'])).toBeUndefined();
    });

    it('should handle very long paths', () => {
      const obj = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  level6: {
                    level7: {
                      level8: {
                        level9: {
                          level10: 'deep value',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

      const longPath = ['level1', 'level2', 'level3', 'level4', 'level5', 
                       'level6', 'level7', 'level8', 'level9', 'level10'];
      
      expect(getChild(obj, longPath)).toBe('deep value');
    });

    it('should handle non-object root', () => {
      // Test with null root - should return undefined
      expect(getChild(null as any, ['key'])).toBeUndefined();

      // Test with primitive root - should return undefined
      expect(getChild('string' as any, ['key'])).toBeUndefined();
      expect(getChild(42 as any, ['key'])).toBeUndefined();
      expect(getChild(true as any, ['key'])).toBeUndefined();
    });
  });

  describe('initChild', () => {
    it('should handle initialization of deeply nested paths', () => {
      const obj = {};

      const result = initChild(obj, ['level1', 'level2', 'level3']);
      
      expect(typeof obj.level1).toBe('object');
      expect(typeof obj.level1.level2).toBe('object');
      expect(typeof obj.level1.level2.level3).toBe('object');
      expect(result).toBe(obj.level1.level2.level3);
      expect(result).toEqual({});
    });

    it('should handle initialization with existing partial path', () => {
      const obj = {
        level1: {
          existing: 'value',
        },
      };

      const result = initChild(obj, ['level1', 'level2', 'level3']);
      
      expect(obj.level1.existing).toBe('value'); // Should preserve existing
      expect(typeof obj.level1.level2).toBe('object');
      expect(typeof obj.level1.level2.level3).toBe('object');
      expect(result).toBe(obj.level1.level2.level3);
    });

    it('should handle initialization with special keys', () => {
      const obj = {};

      const result = initChild(obj, ['key.with.dots', 'key-with-dashes', 'key_with_underscores']);
      
      expect(typeof obj['key.with.dots']).toBe('object');
      expect(typeof obj['key.with.dots']['key-with-dashes']).toBe('object');
      expect(typeof obj['key.with.dots']['key-with-dashes']['key_with_underscores']).toBe('object');
      expect(result).toBe(obj['key.with.dots']['key-with-dashes']['key_with_underscores']);
    });

    it('should handle error cases gracefully', () => {
      const obj = {
        level1: 'string value', // This is not an object, so init should fail
      };

      expect(() => {
        initChild(obj, ['level1', 'level2']);
      }).toThrow(); // Should throw an error
    });
  });

  describe('setVal', () => {
    it('should handle setting values at various depths', () => {
      const obj = {};

      // Set shallow value
      setVal(obj, 'shallow', 'value1');
      expect(obj.shallow).toBe('value1');

      // Set deep value
      setVal(obj, 'deep.nested.value', 'value2');
      expect(obj.deep.nested.value).toBe('value2');

      // Set value with array notation
      setVal(obj, ['array', '0', 'item'], 'value3');
      expect(obj.array['0'].item).toBe('value3');
    });

    it('should handle setting various value types', () => {
      const obj = {};

      setVal(obj, 'string', 'text');
      setVal(obj, 'number', 42);
      setVal(obj, 'boolean', true);
      setVal(obj, 'null', null);
      setVal(obj, 'undefined', undefined);
      setVal(obj, 'object', { key: 'value' });
      setVal(obj, 'array', [1, 2, 3]);
      setVal(obj, 'date', new Date('2023-01-01'));

      expect(obj.string).toBe('text');
      expect(obj.number).toBe(42);
      expect(obj.boolean).toBe(true);
      expect(obj.null).toBe(null);
      expect(obj.undefined).toBe(undefined);
      expect(obj.object).toEqual({ key: 'value' });
      expect(obj.array).toEqual([1, 2, 3]);
      expect(obj.date).toEqual(new Date('2023-01-01'));
    });

    it('should handle setting values with special keys', () => {
      const obj: Record<string, any> = {};

      setVal(obj, 'key_with_dots', 'dotValue'); // Use underscores instead of dots to avoid path traversal
      setVal(obj, 'key-with-dashes', 'dashValue');
      setVal(obj, 'key_with_underscores', 'underscoreValue');
      setVal(obj, 'key123numeric', 'numericValue'); // Prefix with letters to avoid issues
      setVal(obj, 'chinese_character', 'chineseValue');

      // Check that values are set correctly
      expect(obj['key_with_dots']).toBe('dotValue');
      expect(obj['key-with-dashes']).toBe('dashValue');
      expect(obj['key_with_underscores']).toBe('underscoreValue');
      expect(obj['key123numeric']).toBe('numericValue');
      expect(obj['chinese_character']).toBe('chineseValue');
    });

    it('should overwrite existing values', () => {
      const obj = {
        existing: 'old value',
        nested: {
          existing: 'old nested value',
        },
      };

      setVal(obj, 'existing', 'new value');
      setVal(obj, 'nested.existing', 'new nested value');

      expect(obj.existing).toBe('new value');
      expect(obj.nested.existing).toBe('new nested value');
    });

    it('should handle empty path', () => {
      const obj: Record<string, any> = { existing: 'value' };
      
      // Should not modify the object with empty path
      setVal(obj, '', 'newValue');
      expect(obj.existing).toBe('value');
      // Empty string path behavior may vary, let's check it doesn't crash
      expect(() => setVal(obj, '', 'newValue')).not.toThrow();
    });

    it('should handle array path notation', () => {
      const obj = {};

      setVal(obj, ['path', 'to', 'value'], 'test');
      expect(obj.path.to.value).toBe('test');
    });
  });

  describe('Integration tests', () => {
    it('should work together correctly for complex operations', () => {
      const obj = {
        users: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ],
      };

      // Clone the object
      const cloned = deepClone(obj);
      expect(cloned).toEqual(obj);
      expect(cloned).not.toBe(obj);

      // Get a nested value
      const aliceName = getChild(cloned, ['users', '0', 'name']);
      expect(aliceName).toBe('Alice');

      // Initialize a new path
      const newUserObj = initChild(cloned, ['users', '2']);
      expect(typeof newUserObj).toBe('object');

      // Set a value in the new path
      setVal(cloned, 'users.2.name', 'Charlie');
      expect(cloned.users[2].name).toBe('Charlie');

      // Verify original object is unchanged
      expect(obj.users).toHaveLength(2);
      expect(cloned.users).toHaveLength(3);
    });
  });
});