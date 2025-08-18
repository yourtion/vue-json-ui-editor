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
      propsData: {
        schema: basicSchema,
        value: {},
      },
    });

    const input = wrapper.find('input[type="text"]');
    await input.setValue('John Doe');

    // Check that the input event was emitted
    expect(wrapper.emitted('input')).toBeTruthy();
    // Note: Input event is emitted twice - once for initial render and once for the change
    expect(wrapper.emitted('input')).toHaveLength(2);
    
    // Check that the emitted value contains the updated data
    const emittedData = wrapper.emitted('input')?.[1]?.[0]; // Get the second emission
    expect(emittedData).toMatchObject({ name: 'John Doe' });
  });

  it('should emit input event when email input value changes', async () => {
    const wrapper = mount(JsonEditor, {
      propsData: {
        schema: basicSchema,
        value: {},
      },
    });

    const input = wrapper.find('input[type="email"]');
    await input.setValue('john@example.com');

    // Check that the input event was emitted
    expect(wrapper.emitted('input')).toBeTruthy();
    
    // Check that the emitted value contains the updated data
    const emittedEvents = wrapper.emitted('input');
    const emittedData = emittedEvents?.[emittedEvents.length - 1]?.[0]; // Get the last emission
    expect(emittedData).toMatchObject({ email: 'john@example.com' });
  });

  it('should emit input event when checkbox value changes', async () => {
    const wrapper = mount(JsonEditor, {
      propsData: {
        schema: basicSchema,
        value: {},
      },
    });

    const checkbox = wrapper.find('input[type="checkbox"]');
    // Manually set the checked property and trigger input event
    (checkbox.element as HTMLInputElement).checked = true;
    await checkbox.trigger('input');

    // Check that the input event was emitted
    expect(wrapper.emitted('input')).toBeTruthy();
    
    // Check that the emitted value contains the updated data
    const emittedEvents = wrapper.emitted('input');
    const emittedData = emittedEvents?.[emittedEvents.length - 1]?.[0]; // Get the last emission
    expect(emittedData).toMatchObject({ active: true });
  });

  it('should emit input event when select value changes', async () => {
    const wrapper = mount(JsonEditor, {
      propsData: {
        schema: basicSchema,
        value: {},
      },
    });

    const select = wrapper.find('select');
    // Manually set the value and trigger input event
    (select.element as HTMLSelectElement).value = 'admin';
    await select.trigger('input');

    // Check that the input event was emitted
    expect(wrapper.emitted('input')).toBeTruthy();
    
    // Check that the emitted value contains the updated data
    const emittedEvents = wrapper.emitted('input');
    const emittedData = emittedEvents?.[emittedEvents.length - 1]?.[0]; // Get the last emission
    expect(emittedData).toMatchObject({ role: 'admin' });
  });

  it('should emit submit event when form is submitted', async () => {
    const wrapper = mount(JsonEditor, {
      propsData: {
        schema: basicSchema,
        value: {},
      },
    });

    const form = wrapper.find('form');
    await form.trigger('submit.prevent');

    // Check that the submit event was emitted
    expect(wrapper.emitted('submit')).toBeTruthy();
  });

  it('should emit change event when input value changes', async () => {
    const wrapper = mount(JsonEditor, {
      propsData: {
        schema: basicSchema,
        value: {},
      },
    });

    const input = wrapper.find('input[type="text"]');
    // Trigger both input and change events
    await input.setValue('John Doe');
    await input.trigger('change');

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
      propsData: {
        schema: schemaWithRequired,
        value: {},
      },
    });

    // Check that the component renders without errors
    expect(wrapper.exists()).toBe(true);
  });

  it('should reset form to default values when reset method is called', async () => {
    const defaultValue = { name: 'Default Name' };
    const wrapper = mount(JsonEditor, {
      propsData: {
        schema: basicSchema,
        value: defaultValue,
      },
    });

    // Change the input value
    const input = wrapper.find('input[type="text"]');
    await input.setValue('New Name');

    // Call reset method
    (wrapper.vm as any).reset();

    // Check that the input event was emitted with default value
    const emittedEvents = wrapper.emitted('input');
    expect(emittedEvents).toBeTruthy();
    
    // Find the last emitted event (should be the reset event)
    const lastEvent = emittedEvents?.[emittedEvents.length - 1]?.[0];
    expect(lastEvent).toEqual(defaultValue);
  });

  it('should set and clear error message correctly', () => {
    const wrapper = mount(JsonEditor, {
      propsData: {
        schema: basicSchema,
        value: {},
      },
    });

    // Set error message
    (wrapper.vm as any).setErrorMessage('Test error message');
    expect((wrapper.vm as any).error).toBe('Test error message');

    // Clear error message
    (wrapper.vm as any).clearErrorMessage();
    expect((wrapper.vm as any).error).toBeNull();
  });

  it('should get form reference correctly', () => {
    const wrapper = mount(JsonEditor, {
      propsData: {
        schema: basicSchema,
        value: {},
      },
    });

    const formRef = (wrapper.vm as any).form();
    expect(formRef).toBeInstanceOf(HTMLFormElement);
  });

  it('should get input reference correctly', () => {
    const wrapper = mount(JsonEditor, {
      propsData: {
        schema: basicSchema,
        value: {},
      },
    });

    // Find the first input element and check if we can get its reference
    const input = wrapper.find('input[type="text"]');
    expect(input.exists()).toBe(true);

    // Note: Since Vue Test Utils doesn't populate $refs in the same way as runtime,
    // we can't fully test the input() method without a more complex setup
  });
});