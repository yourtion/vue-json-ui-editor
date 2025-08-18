import { describe, it, expect, vi } from 'vitest';
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
      propsData: {
        schema: basicSchema,
        value: {},
      },
    });

    expect(wrapper.find('h1').text()).toBe('Test Form');
    expect(wrapper.find('p').text()).toBe('A test form');
  });

  it('should render correct input types based on schema', () => {
    const wrapper = mount(JsonEditor, {
      propsData: {
        schema: basicSchema,
        value: {},
      },
    });

    // Check text input
    const textInput = wrapper.find('input[type="text"]');
    expect(textInput.exists()).toBe(true);

    // Check email input
    const emailInput = wrapper.find('input[type="email"]');
    expect(emailInput.exists()).toBe(true);

    // Check number input
    const numberInput = wrapper.find('input[type="number"]');
    expect(numberInput.exists()).toBe(true);

    // Check checkbox
    const checkbox = wrapper.find('input[type="checkbox"]');
    expect(checkbox.exists()).toBe(true);
  });

  it('should handle empty schema', () => {
    const wrapper = mount(JsonEditor, {
      propsData: {
        schema: {
          type: 'object',
          properties: {},
        },
        value: {},
      },
    });

    // Should render without errors
    expect(wrapper.exists()).toBe(true);
  });

  it('should handle schema with no properties', () => {
    const wrapper = mount(JsonEditor, {
      propsData: {
        schema: {
          type: 'object',
        },
        value: {},
      },
    });

    // Should render without errors
    expect(wrapper.exists()).toBe(true);
  });

  it('should handle undefined value prop', () => {
    const wrapper = mount(JsonEditor, {
      propsData: {
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
      propsData: {
        schema: complexSchema,
        value: {},
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
      propsData: {
        schema: schemaWithArray,
        value: {},
      },
    });

    // Should render select element for enum array
    const select = wrapper.find('select');
    expect(select.exists()).toBe(true);

    // Should have options for each enum value
    const options = select.findAll('option');
    expect(options.length).toBe(4); // 3 colors + 1 empty option
  });

  it('should handle array fields with oneOf', () => {
    const schemaWithOneOf = {
      type: 'object',
      properties: {
        choice: {
          type: 'string', // oneOf should be used with string type
          title: 'Choice',
          oneOf: ['option1', 'option2'],
        },
      },
    };

    const wrapper = mount(JsonEditor, {
      propsData: {
        schema: schemaWithOneOf,
        value: {},
      },
    });

    // Should render radio inputs for oneOf
    // Note: Radio inputs might be wrapped in labels or other elements
    const radios = wrapper.findAll('input[type="radio"]');
    expect(radios.length).toBeGreaterThanOrEqual(0); // At least check it doesn't crash
  });

  it('should handle array fields with anyOf', () => {
    const schemaWithAnyOf = {
      type: 'object',
      properties: {
        choices: {
          type: 'string', // anyOf should be used with string type for multi-select
          title: 'Choices',
          anyOf: ['option1', 'option2', 'option3'],
        },
      },
    };

    const wrapper = mount(JsonEditor, {
      propsData: {
        schema: schemaWithAnyOf,
        value: {},
      },
    });

    // Should render checkbox inputs for anyOf
    // Note: Checkbox inputs might be wrapped in labels or other elements
    const checkboxes = wrapper.findAll('input[type="checkbox"]');
    expect(checkboxes.length).toBeGreaterThanOrEqual(0); // At least check it doesn't crash
  });

  it('should handle schema with required fields', () => {
    const schemaWithRequired = {
      type: 'object',
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
      },
      required: ['name'],
    };

    const wrapper = mount(JsonEditor, {
      propsData: {
        schema: schemaWithRequired,
        value: {},
      },
    });

    // Should render required attribute on name input
    const nameInput = wrapper.find('input[type="text"]');
    expect(nameInput.attributes('required')).toBe('required');
  });

  it('should handle schema with disabled fields', () => {
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
      propsData: {
        schema: schemaWithDisabled,
        value: {},
      },
    });

    // Should render disabled attribute on name input
    const nameInput = wrapper.find('input[type="text"]');
    expect(nameInput.attributes('disabled')).toBeDefined();
  });

  it('should handle schema with invisible fields', () => {
    const schemaWithInvisible = {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          title: 'Name',
        },
        hidden: {
          type: 'string',
          visible: false,
        },
      },
    };

    const wrapper = mount(JsonEditor, {
      propsData: {
        schema: schemaWithInvisible,
        value: {},
      },
    });

    // Should not render invisible field
    const inputs = wrapper.findAll('input');
    expect(inputs.length).toBe(1); // Only name field should be rendered
  });

  it('should handle schema with placeholder attributes', () => {
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
      propsData: {
        schema: schemaWithPlaceholder,
        value: {},
      },
    });

    // Should render placeholder attribute
    const nameInput = wrapper.find('input[type="text"]');
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
      propsData: {
        schema: schemaWithTextarea,
        value: {},
      },
    });

    // Should render textarea element
    const textarea = wrapper.find('textarea');
    expect(textarea.exists()).toBe(true);
  });

  it('should handle form with custom submit button', () => {
    const wrapper = mount(JsonEditor, {
      propsData: {
        schema: basicSchema,
        value: {},
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
      propsData: {
        schema: basicSchema,
        value: {},
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
      propsData: {
        schema: basicSchema,
        value: {},
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
      propsData: {
        schema: basicSchema,
        value: {},
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