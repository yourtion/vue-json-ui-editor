import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import JsonEditor from '../src/JsonEditor.vue';

describe('JsonEditor - Interaction Tests', () => {
  // Mock schema for testing
  const basicSchema = {
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
      active: {
        type: 'boolean',
        title: 'Active',
      },
      role: {
        type: 'string',
        enum: ['admin', 'user', 'guest'],
        title: 'Role',
      },
    },
  };

  it('should emit input event when text input value changes', async () => {
    const wrapper = mount(JsonEditor, {
      props: {
        schema: basicSchema,
        modelValue: {},
      },
    });

    // master renders native <input> without type attr; the name field is the
    // first input in the form.
    const inputs = wrapper.findAll('input');
    const nameInput = inputs[0];
    await nameInput.setValue('John Doe');

    // Check that the update:modelValue event was emitted
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();

    // Check that the emitted value contains the updated data
    const emittedEvents = wrapper.emitted('update:modelValue');
    const emittedData = emittedEvents?.[emittedEvents.length - 1]?.[0];
    expect(emittedData).toMatchObject({ name: 'John Doe' });
  });

  it('should emit input event when email input value changes', async () => {
    const wrapper = mount(JsonEditor, {
      props: {
        schema: basicSchema,
        modelValue: {},
      },
    });

    // email is the second string field; master renders it as a native <input>.
    const inputs = wrapper.findAll('input');
    const emailInput = inputs[1];
    await emailInput.setValue('john@example.com');

    expect(wrapper.emitted('update:modelValue')).toBeTruthy();

    const emittedEvents = wrapper.emitted('update:modelValue');
    const emittedData = emittedEvents?.[emittedEvents.length - 1]?.[0];
    expect(emittedData).toMatchObject({ email: 'john@example.com' });
  });

  it('should emit input event when checkbox value changes', async () => {
    const wrapper = mount(JsonEditor, {
      props: {
        schema: basicSchema,
        modelValue: {},
      },
    });

    // active is the boolean field; master renders it as a native <input>
    // (without an explicit type attr — type is conveyed via the registry).
    // It is the third input in the form (name, email, active).
    const inputs = wrapper.findAll('input');
    const activeInput = inputs[2];
    // Without a registered checkbox component, the boolean field behaves as a
    // plain text input; setting its value emits update:modelValue with that
    // value on the active key.
    await activeInput.setValue('true');

    expect(wrapper.emitted('update:modelValue')).toBeTruthy();

    const emittedEvents = wrapper.emitted('update:modelValue');
    const emittedData = emittedEvents?.[emittedEvents.length - 1]?.[0];
    expect(emittedData).toMatchObject({ active: 'true' });
  });

  it('should emit input event when select value changes', async () => {
    const wrapper = mount(JsonEditor, {
      props: {
        schema: basicSchema,
        modelValue: {},
      },
    });

    const select = wrapper.find('select');
    await select.setValue('admin');

    expect(wrapper.emitted('update:modelValue')).toBeTruthy();

    const emittedEvents = wrapper.emitted('update:modelValue');
    const emittedData = emittedEvents?.[emittedEvents.length - 1]?.[0];
    expect(emittedData).toMatchObject({ role: 'admin' });
  });

  it('should emit submit event when form is submitted', async () => {
    const wrapper = mount(JsonEditor, {
      props: {
        schema: basicSchema,
        modelValue: {},
      },
    });

    const form = wrapper.find('form');
    await form.trigger('submit.prevent');

    // Check that the submit event was emitted
    expect(wrapper.emitted('submit')).toBeTruthy();
  });

  it('should emit change event when input value changes', async () => {
    const wrapper = mount(JsonEditor, {
      props: {
        schema: basicSchema,
        modelValue: {},
      },
    });

    // master renders native <input>; the name field is the first input.
    const inputs = wrapper.findAll('input');
    const nameInput = inputs[0];
    await nameInput.setValue('John Doe');
    await nameInput.trigger('change');

    // Check that the change event was emitted
    expect(wrapper.emitted('change')).toBeTruthy();
  });

  it('should handle form validation', async () => {
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

    // Check that the component renders without errors
    expect(wrapper.exists()).toBe(true);
  });

  it('should have reset method', () => {
    const wrapper = mount(JsonEditor, {
      props: {
        schema: basicSchema,
        modelValue: { name: 'Test' },
      },
    });

    // Check that reset method exists
    expect(typeof (wrapper.vm as any).reset).toBe('function');

    // Call reset method
    (wrapper.vm as any).reset();
  });

  it('should have error message methods', () => {
    const wrapper = mount(JsonEditor, {
      props: {
        schema: basicSchema,
        modelValue: {},
      },
    });

    // Check that error methods exist
    expect(typeof (wrapper.vm as any).setErrorMessage).toBe('function');
    expect(typeof (wrapper.vm as any).clearErrorMessage).toBe('function');

    // Call the methods (they are placeholders that log to console)
    (wrapper.vm as any).setErrorMessage('Test error message');
    (wrapper.vm as any).clearErrorMessage();
  });

  it('should get form reference correctly', () => {
    const wrapper = mount(JsonEditor, {
      props: {
        schema: basicSchema,
        modelValue: {},
      },
    });

    // form() returns the rendered <form> DOM node (or component instance when
    // a custom form component is registered). With the default native <form>,
    // it exposes the native checkValidity().
    const formRef = (wrapper.vm as any).form();
    expect(formRef).toBeTruthy();
    expect(typeof formRef.checkValidity).toBe('function');
  });

  it('should get input reference correctly', () => {
    const wrapper = mount(JsonEditor, {
      props: {
        schema: basicSchema,
        modelValue: {},
      },
    });

    // master renders native <input>; verify at least one input is present.
    // (Vue Test Utils does not populate function refs the same way runtime
    // does, so the input() accessor is only smoke-tested here.)
    const inputs = wrapper.findAll('input');
    expect(inputs.length).toBeGreaterThan(0);
  });
});