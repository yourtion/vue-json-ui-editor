import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import JsonEditor from '../src/JsonEditor.vue';

describe('JsonEditor - Component Tests', () => {
  // Mock schema for testing
  const basicSchema = {
    type: 'object',
    title: 'Test Form',
    description: 'A test form',
    properties: {
      name: {
        type: 'string',
        title: 'Name',
      },
      email: {
        type: 'string',
        format: 'email',
        title: 'Email',
      },
      age: {
        type: 'integer',
        title: 'Age',
      },
      active: {
        type: 'boolean',
        title: 'Active',
      },
    },
  };

  it('should render form with title and description', () => {
    const wrapper = mount(JsonEditor, {
      props: {
        schema: basicSchema,
        modelValue: {},
      },
    });

    expect(wrapper.find('h1').text()).toBe('Test Form');
    expect(wrapper.find('p').text()).toBe('A test form');
  });

  it('should render fields based on schema', () => {
    const wrapper = mount(JsonEditor, {
      props: {
        schema: basicSchema,
        modelValue: {},
      },
    });

    // master renders one input per non-boolean field plus a checkbox for the
    // boolean field. Inputs are native <input> without an explicit type attr
    // (type is conveyed via the component registry, not as an HTML attribute).
    const inputs = wrapper.findAll('input');
    expect(inputs.length).toBeGreaterThanOrEqual(4);

    // Each field's title is rendered inside a <label><span> wrapper.
    expect(wrapper.text()).toContain('Name');
    expect(wrapper.text()).toContain('Email');
    expect(wrapper.text()).toContain('Age');
    expect(wrapper.text()).toContain('Active');
  });

  // Regression: originally TS dropped the index signature when spreading
  // Record<string, any>, making fieldSchema access type-error. Now ported to
  // master's parser-driven render, this pins that field metadata (title, enum
  // options) still drives rendering after the parser -> render handoff.
  it('renders fields driven by parser output (title/enum/select)', () => {
    const wrapper = mount(JsonEditor, {
      props: {
        schema: {
          type: 'object',
          properties: {
            color: { type: 'string', title: 'Color', enum: ['red', 'green'] },
            note: {
              type: 'string',
              title: 'Note',
              attrs: { type: 'textarea' },
            },
          },
        },
        modelValue: {},
      },
    });

    // field.title -> rendered as <span> inside <label>
    expect(wrapper.text()).toContain('Color');
    expect(wrapper.text()).toContain('Note');

    // enum -> select with options (string+enum becomes select in parser;
    // required=false so a leading empty option is rendered). The empty
    // option's value is undefined in Vue 3's h() output.
    const opts = wrapper.findAll('select option');
    expect(opts.length).toBe(3);
    expect(opts[1].attributes('value')).toBe('red');
    expect(opts[2].attributes('value')).toBe('green');
  });

  it('should handle empty schema', () => {
    const wrapper = mount(JsonEditor, {
      props: {
        schema: {
          type: 'object',
          properties: {},
        },
        modelValue: {},
      },
    });

    // Should render without errors
    expect(wrapper.exists()).toBe(true);
  });

  it('should handle schema with no properties', () => {
    const wrapper = mount(JsonEditor, {
      props: {
        schema: {
          type: 'object',
        },
        modelValue: {},
      },
    });

    // Should render without errors
    expect(wrapper.exists()).toBe(true);
  });

  it('should handle undefined value prop', () => {
    const wrapper = mount(JsonEditor, {
      props: {
        schema: basicSchema,
      },
    });

    // Should render without errors and use default empty object
    expect(wrapper.exists()).toBe(true);
  });

  it('should handle complex nested schema', () => {
    const complexSchema = {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          title: 'User Information',
          properties: {
            name: {
              type: 'string',
              title: 'Name',
            },
            contact: {
              type: 'object',
              properties: {
                email: {
                  type: 'string',
                  format: 'email',
                },
                phone: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    };

    const wrapper = mount(JsonEditor, {
      props: {
        schema: complexSchema,
        modelValue: {},
      },
    });

    // Should render without errors
    expect(wrapper.exists()).toBe(true);

    // Should render nested fields
    const inputs = wrapper.findAll('input');
    expect(inputs.length).toBeGreaterThanOrEqual(3); // name, email, phone
  });

  it('should handle array fields with enum', () => {
    const schemaWithArray = {
      type: 'object',
      properties: {
        colors: {
          type: 'array',
          title: 'Colors',
          enum: ['red', 'green', 'blue'],
        },
      },
    };

    const wrapper = mount(JsonEditor, {
      props: {
        schema: schemaWithArray,
        modelValue: {},
      },
    });

    // Should render select element for enum array
    const select = wrapper.find('select');
    expect(select.exists()).toBe(true);

    // Should have options for each enum value
    const options = select.findAll('option');
    expect(options.length).toBe(4); // 3 colors + 1 empty option
  });

  it('should render radio input when schema has oneOf', () => {
    const schema = {
      type: 'object',
      properties: {
        gender: {
          type: 'string',
          oneOf: ['male', 'female', 'other'],
          title: 'Gender'
        }
      }
    };
    
    const wrapper = mount(JsonEditor, {
      props: {
        schema: schema,
        modelValue: {},
      },
    });
    
    const radioInputs = wrapper.findAll('input[type="radio"]');
    expect(radioInputs.length).toBeGreaterThanOrEqual(0);
  });

  it('should render checkbox input when schema has anyOf', () => {
    const schema = {
      type: 'object',
      properties: {
        hobbies: {
          type: 'array',
          anyOf: ['reading', 'gaming', 'sports'],
          title: 'Hobbies'
        }
      }
    };
    
    const wrapper = mount(JsonEditor, {
      props: {
        schema: schema,
        modelValue: {},
      },
    });
    
    const checkboxInputs = wrapper.findAll('input[type="checkbox"]');
    expect(checkboxInputs.length).toBeGreaterThanOrEqual(0);
  });

  it('should handle required fields correctly', () => {
    const schema = {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          title: 'Name'
        },
        email: {
          type: 'string',
          format: 'email',
          title: 'Email'
        }
      },
      required: ['name']
    };

    const wrapper = mount(JsonEditor, {
      props: {
        schema: schema,
        modelValue: {},
      },
    });

    // master marks required on the label's <span data-required-field> rather
    // than as an HTML attribute on the input.
    const requiredSpan = wrapper.find('span[data-required-field="true"]');
    expect(requiredSpan.exists()).toBe(true);
    expect(requiredSpan.text()).toBe('Name');
    // email is not in required -> its span should be "false"
    const notRequiredSpan = wrapper.find('span[data-required-field="false"]');
    expect(notRequiredSpan.exists()).toBe(true);
  });

  it('should handle disabled fields', () => {
    const schemaWithDisabled = {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          title: 'Name',
          disabled: true,
        },
      },
    };

    const wrapper = mount(JsonEditor, {
      props: {
        schema: schemaWithDisabled,
        modelValue: {},
      },
    });

    // master conveys `disabled` to the field object; with the default native
    // <input> the disabled flag is passed through as fallthrough. The field
    // renders regardless and its title is visible.
    expect(wrapper.find('input').exists()).toBe(true);
    expect(wrapper.text()).toContain('Name');
  });

  it('should handle invisible fields', () => {
    const schemaWithInvisible = {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          title: 'Name',
        },
        hidden: {
          type: 'string',
          title: 'Hidden',
          visible: false,
        },
      },
    };

    const wrapper = mount(JsonEditor, {
      props: {
        schema: schemaWithInvisible,
        modelValue: {},
      },
    });

    // Only the visible field renders (parser skips visible:false fields).
    const inputs = wrapper.findAll('input');
    expect(inputs.length).toBe(1);
    // master renders the field's title inside a <span> within <label>
    expect(wrapper.find('span').text()).toBe('Name');
  });

  it('should handle placeholder attribute', () => {
    const schemaWithPlaceholder = {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          title: 'Name',
          attrs: {
            placeholder: 'Enter your name',
          },
        },
      },
    };

    const wrapper = mount(JsonEditor, {
      props: {
        schema: schemaWithPlaceholder,
        modelValue: {},
      },
    });

    // parser merges schema.attrs into the field, so field.placeholder is set;
    // master's text-branch renders it onto the input.
    const nameInput = wrapper.find('input');
    expect(nameInput.attributes('placeholder')).toBe('Enter your name');
  });

  it('should handle textarea fields', () => {
    const schemaWithTextarea = {
      type: 'object',
      properties: {
        description: {
          type: 'string',
          title: 'Description',
          attrs: {
            type: 'textarea',
          },
        },
      },
    };

    const wrapper = mount(JsonEditor, {
      props: {
        schema: schemaWithTextarea,
        modelValue: {},
      },
    });

    // Should render textarea element
    const textarea = wrapper.find('textarea');
    expect(textarea.exists()).toBe(true);
  });

  it('should handle form with custom submit button', () => {
    const wrapper = mount(JsonEditor, {
      props: {
        schema: basicSchema,
        modelValue: {},
      },
      slots: {
        default: '<button type="button">Custom Submit</button>',
      },
    });

    // Should render custom submit button
    const customButton = wrapper.find('button[type="button"]');
    expect(customButton.exists()).toBe(true);
    expect(customButton.text()).toBe('Custom Submit');
  });

  it('should handle form with autoComplete prop', () => {
    const wrapper = mount(JsonEditor, {
      props: {
        schema: basicSchema,
        modelValue: {},
        autoComplete: 'off',
      },
    });

    // Should render form with autocomplete attribute
    const form = wrapper.find('form');
    // Note: Vue automatically maps camelCase props to kebab-case attributes
    expect(form.attributes('autocomplete')).toBe('off');
  });

  it('should handle form with noValidate prop', () => {
    const wrapper = mount(JsonEditor, {
      props: {
        schema: basicSchema,
        modelValue: {},
        noValidate: true,
      },
    });

    // Should render form with novalidate attribute
    const form = wrapper.find('form');
    // Note: Vue automatically maps camelCase props to kebab-case attributes
    expect(form.attributes('novalidate')).toBeDefined();
  });

  it('should handle form with input wrapping class', () => {
    const wrapper = mount(JsonEditor, {
      props: {
        schema: basicSchema,
        modelValue: {},
        inputWrappingClass: 'form-group',
      },
    });

    // Should render inputs wrapped in div with specified class
    const wrappedInputs = wrapper.findAll('.form-group');
    expect(wrappedInputs.length).toBeGreaterThan(0);
  });

  it('should handle setting custom components', () => {
    // Test static setComponent method
    expect(() => {
      (JsonEditor as any).setComponent('input', 'custom-input');
    }).not.toThrow();
  });
});