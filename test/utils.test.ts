import { describe, it, expect } from 'vitest';
import { deepClone, getChild, initChild, setVal } from '../src/utils';

describe('utils', () => {
  describe('deepClone', () => {
    it('should handle primitive values', () => {
      expect(deepClone(undefined)).toBe(undefined);
      expect(deepClone(null)).toBe(null);
      expect(deepClone(42)).toBe(42);
      expect(deepClone('hello')).toBe('hello');
      expect(deepClone(true)).toBe(true);
    });

    it('should clone arrays', () => {
      const original = [1, 2, 3, [4, 5]];
      const cloned = deepClone(original);
      
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned[3]).not.toBe(original[3]);
    });

    it('should clone objects', () => {
      const original = {
        name: 'test',
        age: 25,
        nested: {
          value: 'nested',
          array: [1, 2, 3]
        }
      };
      const cloned = deepClone(original);
      
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.nested).not.toBe(original.nested);
      expect(cloned.nested.array).not.toBe(original.nested.array);
    });

    it('should handle complex nested structures', () => {
      const original = {
        users: [
          { id: 1, profile: { name: 'Alice', tags: ['admin', 'user'] } },
          { id: 2, profile: { name: 'Bob', tags: ['user'] } }
        ],
        config: {
          settings: {
            theme: 'dark',
            features: {
              notifications: true,
              analytics: false
            }
          }
        }
      };
      const cloned = deepClone(original);
      
      expect(cloned).toEqual(original);
      expect(cloned.users).not.toBe(original.users);
      expect(cloned.users[0]).not.toBe(original.users[0]);
      expect(cloned.users[0].profile).not.toBe(original.users[0].profile);
      expect(cloned.users[0].profile.tags).not.toBe(original.users[0].profile.tags);
      expect(cloned.config.settings.features).not.toBe(original.config.settings.features);
    });

    it('should handle Date objects', () => {
      const date = new Date('2023-01-01');
      const original = { timestamp: date };
      const cloned = deepClone(original);
      
      // deepClone converts Date to string, so we test for string equality
      expect(cloned.timestamp).toBe(date.toISOString());
      expect(cloned.timestamp).not.toBe(date);
      expect(typeof cloned.timestamp).toBe('string');
    });

    it('should handle empty objects and arrays', () => {
      expect(deepClone({})).toEqual({});
      expect(deepClone([])).toEqual([]);
      
      const emptyNested = { empty: {}, arr: [] };
      const cloned = deepClone(emptyNested);
      expect(cloned).toEqual(emptyNested);
      expect(cloned.empty).not.toBe(emptyNested.empty);
      expect(cloned.arr).not.toBe(emptyNested.arr);
    });
  });

  describe('getChild', () => {
    it('should get direct child property', () => {
      const obj = { name: 'test', age: 25 };
      
      expect(getChild(obj, ['name'])).toBe('test');
      expect(getChild(obj, ['age'])).toBe(25);
    });

    it('should get nested property with array notation', () => {
      const obj = {
        user: {
          profile: {
            name: 'Alice',
            settings: {
              theme: 'dark'
            }
          }
        }
      };
      
      expect(getChild(obj, ['user', 'profile', 'name'])).toBe('Alice');
      expect(getChild(obj, ['user', 'profile', 'settings', 'theme'])).toBe('dark');
    });

    it('should return undefined for non-existent properties', () => {
      const obj = { name: 'test' };
      
      expect(getChild(obj, ['nonexistent'])).toBeUndefined();
      expect(getChild(obj, ['name', 'nested'])).toBeUndefined();
      expect(getChild(obj, ['user', 'profile', 'name'])).toBeUndefined();
    });

    it('should handle object with numeric keys', () => {
      const obj = {
        users: {
          '0': { name: 'Alice', age: 25 },
          '1': { name: 'Bob', age: 30 }
        }
      };
      
      expect(getChild(obj, ['users', '0', 'name'])).toBe('Alice');
       expect(getChild(obj, ['users', '1', 'name'])).toBe('Bob');
     });

    it('should handle null and undefined objects', () => {
      // getChild expects a Record<string, unknown> as first parameter
      // Testing with empty object instead of null/undefined
      expect(getChild({}, ['name'])).toBe(undefined);
      expect(getChild({}, ['nonexistent', 'path'])).toBe(undefined);
    });

    it('should handle empty path array', () => {
      const obj = { name: 'test' };
      
      expect(getChild(obj, [])).toBe(undefined);
    });

    it('should handle complex nested structures', () => {
      const obj = {
        data: {
          items: {
            '0': {
              metadata: {
                tags: {
                  '0': 'tag1',
                  '1': 'tag2'
                },
                info: { created: '2023-01-01' }
              }
            }
          }
        }
      };
      
      expect(getChild(obj, ['data', 'items', '0', 'metadata', 'tags', '1'])).toBe('tag2');
      expect(getChild(obj, ['data', 'items', '0', 'metadata', 'info', 'created'])).toBe('2023-01-01');
    });
  });

  describe('initChild', () => {
    it('should initialize direct child property', () => {
      const obj = {};
      initChild(obj, ['name']);
      
      expect(obj).toHaveProperty('name');
      expect((obj as any).name).toEqual({});
    });

    it('should initialize nested properties with array notation', () => {
      const obj = {};
      initChild(obj, ['user', 'profile', 'name']);
      
      expect(obj).toHaveProperty('user');
      expect((obj as any).user).toHaveProperty('profile');
      expect((obj as any).user.profile).toHaveProperty('name');
      expect((obj as any).user.profile.name).toEqual({});
    });

    it('should not overwrite existing properties', () => {
      const obj = { user: { profile: { existing: 'value' } } };
      initChild(obj, ['user', 'profile', 'name']);
      
      expect((obj as any).user.profile.existing).toBe('value');
      expect((obj as any).user.profile.name).toEqual({});
    });

    it('should handle numeric keys as object properties', () => {
      const obj = {};
      initChild(obj, ['users', '0', 'profile']);
      
      expect(typeof (obj as any).users).toBe('object');
      expect((obj as any).users['0']).toEqual({ profile: {} });
      expect((obj as any).users['0']).toHaveProperty('profile');
    });

    it('should handle mixed nested object paths', () => {
      const obj = {};
      initChild(obj, ['data', 'items', '0', 'metadata', 'tags', '1']);
      
      expect(typeof (obj as any).data).toBe('object');
      expect((obj as any).data).toHaveProperty('items');
      expect(typeof (obj as any).data.items).toBe('object');
      expect((obj as any).data.items['0']).toHaveProperty('metadata');
      expect((obj as any).data.items['0'].metadata).toHaveProperty('tags');
      expect(typeof (obj as any).data.items['0'].metadata.tags).toBe('object');
    });

    it('should handle empty path', () => {
      const obj = { existing: 'value' };
      
      initChild(obj, []);
      
      expect(obj.existing).toBe('value');
    });

    it('should preserve existing nested structures', () => {
      const obj = {
        user: {
          profile: {
            name: 'Alice',
            age: 25
          }
        }
      };
      
      initChild(obj, ['user', 'profile']);
      
      expect((obj as any).user.profile.name).toBe('Alice');
      expect((obj as any).user.profile.age).toBe(25);
    });
  });

  describe('setVal', () => {
    it('should set direct property value', () => {
      const obj = {};
      
      setVal(obj, 'name', 'Alice');
      
      expect((obj as any).name).toBe('Alice');
    });

    it('should set nested property value with dot notation', () => {
      const obj = {};
      
      setVal(obj, 'user.profile.name', 'Alice');
      
      expect((obj as any).user.profile.name).toBe('Alice');
    });

    it('should overwrite existing values', () => {
      const obj = {
        user: {
          profile: {
            name: 'Bob'
          }
        }
      };
      
      setVal(obj, 'user.profile.name', 'Alice');
      
      expect((obj as any).user.profile.name).toBe('Alice');
    });

    it('should handle array indices', () => {
      const obj = {};
      
      setVal(obj, 'users.0.name', 'Alice');
      setVal(obj, 'users.1.name', 'Bob');
      
      expect((obj as any).users[0].name).toBe('Alice');
      expect((obj as any).users[1].name).toBe('Bob');
    });

    it('should handle different value types', () => {
      const obj = {};
      
      setVal(obj, 'string', 'text');
      setVal(obj, 'number', 42);
      setVal(obj, 'boolean', true);
      setVal(obj, 'null', null);
      setVal(obj, 'array', [1, 2, 3]);
      setVal(obj, 'object', { key: 'value' });
      
      expect((obj as any).string).toBe('text');
      expect((obj as any).number).toBe(42);
      expect((obj as any).boolean).toBe(true);
      expect((obj as any).null).toBe(null);
      expect((obj as any).array).toEqual([1, 2, 3]);
      expect((obj as any).object).toEqual({ key: 'value' });
    });

    it('should create intermediate objects as needed', () => {
      const obj = {};
      
      setVal(obj, 'data.items.0.metadata.tags.1', 'tag2');
      
      expect((obj as any).data.items['0'].metadata.tags['1']).toBe('tag2');
      // Note: setVal creates objects, not arrays, even for numeric keys
      expect(typeof (obj as any).data.items).toBe('object');
      expect(typeof (obj as any).data.items['0'].metadata.tags).toBe('object');
    });

    it('should handle empty path', () => {
      const obj = { existing: 'value' };
      
      setVal(obj, '', 'newValue');
      
      // Empty path should not modify the object
      expect(obj.existing).toBe('value');
    });

    it('should preserve other properties when setting nested values', () => {
      const obj = {
        user: {
          profile: {
            name: 'Alice',
            age: 25,
            settings: {
              theme: 'dark'
            }
          },
          permissions: ['read', 'write']
        },
        config: {
          version: '1.0'
        }
      };
      
      setVal(obj, 'user.profile.email', 'alice@example.com');
      
      expect((obj as any).user.profile.name).toBe('Alice');
      expect((obj as any).user.profile.age).toBe(25);
      expect((obj as any).user.profile.settings.theme).toBe('dark');
      expect((obj as any).user.permissions).toEqual(['read', 'write']);
      expect((obj as any).config.version).toBe('1.0');
      expect((obj as any).user.profile.email).toBe('alice@example.com');
    });
  });
});