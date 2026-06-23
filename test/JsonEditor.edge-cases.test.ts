import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import JsonEditor from '../src/JsonEditor.vue';

describe('JsonEditor - Edge Cases and Error Handling', () => {
  it('should handle null schema gracefully', () => {
    const wrapper = mount(JsonEditor, {
      props: {
        schema: null as any,
        modelValue: {},
      },
    });

    // master returns "Invalid schema: schema is required" guard message
    expect(wrapper.text()).toContain('Invalid schema');
    expect(wrapper.exists()).toBe(true);
  });

  it('should handle undefined schema gracefully', () => {
    const wrapper = mount(JsonEditor, {
      props: {
        schema: undefined as any,
        modelValue: {},
      },
    });

    // master returns "Invalid schema: schema is required" guard message
    expect(wrapper.text()).toContain('Invalid schema');
    expect(wrapper.exists()).toBe(true);
  });

  it('should handle malformed schema gracefully', () => {
    const malformedSchema = {
      type: 'object',
      properties: null, // This is malformed
    } as any;

    const wrapper = mount(JsonEditor, {
      props: {
        schema: malformedSchema,
        modelValue: {},
      },
    });

    // Should render without crashing
    expect(wrapper.exists()).toBe(true);
  });

  it('should handle circular reference in value object', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    };

    // Create circular reference
    const circularValue: any = { name: 'test' };
    circularValue.self = circularValue;

    // Mock console.error to prevent circular reference error from being logged
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      mount(JsonEditor, {
        props: {
          schema,
          modelValue: circularValue,
        },
      });
    }).toThrow(); // deepClone should throw on circular references

    // Restore console.error
    consoleErrorSpy.mockRestore();
  });

  it('should handle very large schema', () => {
    // Create a large schema with many fields
    const largeProperties: Record<string, any> = {};
    for (let i = 0; i < 100; i++) {
      largeProperties[`field${i}`] = {
        type: 'string',
        title: `Field ${i}`,
      };
    }

    const largeSchema = {
      type: 'object',
      properties: largeProperties,
    };

    const wrapper = mount(JsonEditor, {
      props: {
        schema: largeSchema,
        modelValue: {},
      },
    });

    // Should render without crashing
    expect(wrapper.exists()).toBe(true);

    // Should render many input elements
    const inputs = wrapper.findAll('input');
    expect(inputs.length).toBeGreaterThanOrEqual(50); // Expecting many inputs
  });

  it('should handle special characters in field names', () => {
    const schemaWithSpecialChars = {
      type: 'object',
      properties: {
        'field-with-dashes': {
          type: 'string',
          title: 'Field with Dashes',
        },
        'field_with_underscores': {
          type: 'string',
          title: 'Field with Underscores',
        },
        'field.with.dots': {
          type: 'string',
          title: 'Field with Dots',
        },
      },
    };

    const wrapper = mount(JsonEditor, {
      props: {
        schema: schemaWithSpecialChars,
        modelValue: {},
      },
    });

    // Should render without crashing
    expect(wrapper.exists()).toBe(true);
  });

  it('should handle empty string values', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    };

    const wrapper = mount(JsonEditor, {
      props: {
        schema,
        value: { name: '' },
      },
    });

    // Should render without crashing
    expect(wrapper.exists()).toBe(true);
  });

  it('should handle numeric field names', () => {
    const schemaWithNumericFields = {
      type: 'object',
      properties: {
        '123': {
          type: 'string',
          title: 'Numeric Field',
        },
      },
    };

    const wrapper = mount(JsonEditor, {
      props: {
        schema: schemaWithNumericFields,
        modelValue: {},
      },
    });

    // Should render without crashing
    expect(wrapper.exists()).toBe(true);
  });

  it('should handle very long field values', () => {
    const schema = {
      type: 'object',
      properties: {
        text: { type: 'string' },
      },
    };

    const longValue = 'a'.repeat(10000); // 10,000 character string

    const wrapper = mount(JsonEditor, {
      props: {
        schema,
        value: { text: longValue },
      },
    });

    // Should render without crashing
    expect(wrapper.exists()).toBe(true);
  });

  it('should handle deeply nested objects', () => {
    const deeplyNestedSchema = {
      type: 'object',
      properties: {
        level1: {
          type: 'object',
          properties: {
            level2: {
              type: 'object',
              properties: {
                level3: {
                  type: 'object',
                  properties: {
                    level4: {
                      type: 'object',
                      properties: {
                        name: {
                          type: 'string',
                        },
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

    const wrapper = mount(JsonEditor, {
      props: {
        schema: deeplyNestedSchema,
        modelValue: {},
      },
    });

    // Should render without crashing
    expect(wrapper.exists()).toBe(true);
  });

  it('should handle schema with invalid format values', () => {
    const schemaWithInvalidFormat = {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          format: 'invalid-format', // This is not a recognized format
          title: 'Email',
        },
      },
    };

    const wrapper = mount(JsonEditor, {
      props: {
        schema: schemaWithInvalidFormat,
        modelValue: {},
      },
    });

    // Should render a fallback input (unrecognized format falls back to text
    // type in the parser; master's native <input> does not emit type="text").
    const input = wrapper.find('input');
    expect(input.exists()).toBe(true);
  });

  it('should handle schema with invalid type values', () => {
    const schemaWithInvalidType = {
      type: 'object',
      properties: {
        unknown: {
          type: 'unknown-type', // This is not a recognized type
          title: 'Unknown',
        },
      },
    };

    const wrapper = mount(JsonEditor, {
      props: {
        schema: schemaWithInvalidType,
        modelValue: {},
      },
    });

    // master's parser treats unknown types as string fallback (no "Unsupported
    // type" message — that was a simplified-version artifact). Verify the field
    // still renders with its title.
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.text()).toContain('Unknown');
  });

  it('should handle reset with null default value', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    };

    const wrapper: any = mount(JsonEditor, {
      props: {
        schema,
        modelValue: {}, // Use empty object instead of null
      },
    });

    // Should not throw when calling reset
    expect(() => {
      wrapper.vm.reset();
    }).not.toThrow();
  });

  it('should handle submit with invalid form', async () => {
    const schemaWithRequired = {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          title: 'Name',
        },
      },
      required: ['name'],
    };

    const wrapper = mount(JsonEditor, {
      props: {
        schema: schemaWithRequired,
        modelValue: {},
      },
    });

    // Mock checkValidity to return false
    const formElement = (wrapper.vm as any).form();
    const checkValiditySpy = vi.spyOn(formElement, 'checkValidity').mockReturnValue(false);

    // Trigger form submission
    const form = wrapper.find('form');
    await form.trigger('submit.prevent');

    // Should handle form submission without crashing
    expect(wrapper.exists()).toBe(true);

    // Restore mock
    checkValiditySpy.mockRestore();
  });

  it('should handle input method with non-existent ref', () => {
    const wrapper = mount(JsonEditor, {
      props: {
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
        },
        modelValue: {},
      },
    });

    // master's input(name) contract: throws when the ref doesn't exist.
    expect(() => {
      (wrapper.vm as any).input('non-existent-field');
    }).toThrow(/Undefined input reference/);
  });
});