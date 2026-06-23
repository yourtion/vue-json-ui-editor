import { mount } from '@vue/test-utils';
import JsonEditor from '../src/JsonEditor.vue';

describe('JsonEditor', () => {
  const mockSchema = {
    type: 'object',
    properties: {
      name: { type: 'string', title: 'Name' },
      email: { type: 'string', format: 'email', title: 'Email' }
    }
  };

  describe('component structure', () => {
    it('should be a valid Vue component', () => {
      expect(JsonEditor).toBeDefined();
      expect(JsonEditor.name).toBe('JsonEditor');
    });

    it('should have required props', () => {
      const wrapper = mount(JsonEditor, {
        props: {
          schema: mockSchema,
          modelValue: {}
        }
      });
      expect(wrapper.vm).toBeTruthy();
    });
  });

  describe('exposed methods', () => {
    it('should expose reset method', () => {
      const wrapper = mount(JsonEditor, {
        props: {
          schema: mockSchema,
          modelValue: { name: 'test' }
        }
      });

      const vm = wrapper.vm;
      expect(typeof vm.reset).toBe('function');
    });

    it('should expose input method', () => {
      const wrapper = mount(JsonEditor, {
        props: {
          schema: mockSchema,
          modelValue: {}
        }
      });

      const vm = wrapper.vm;
      expect(typeof vm.input).toBe('function');
    });

    it('should expose validate method', () => {
      const wrapper = mount(JsonEditor, {
        props: {
          schema: mockSchema,
          modelValue: {}
        }
      });

      const vm = wrapper.vm;
      expect(typeof vm.validate).toBe('function');
    });

    it('should expose setErrorMessage method', () => {
      const wrapper = mount(JsonEditor, {
        props: {
          schema: mockSchema,
          modelValue: {}
        }
      });

      const vm = wrapper.vm;
      expect(typeof vm.setErrorMessage).toBe('function');
    });

    it('should expose clearErrorMessage method', () => {
      const wrapper = mount(JsonEditor, {
        props: {
          schema: mockSchema,
          modelValue: {}
        }
      });

      const vm = wrapper.vm;
      expect(typeof vm.clearErrorMessage).toBe('function');
    });

    it('should expose form method', () => {
      const wrapper = mount(JsonEditor, {
        props: {
          schema: mockSchema,
          modelValue: {}
        }
      });

      const vm = wrapper.vm;
      expect(typeof vm.form).toBe('function');
    });

    it('should expose getFields method', () => {
      const wrapper = mount(JsonEditor, {
        props: {
          schema: mockSchema,
          modelValue: {}
        }
      });

      const vm = wrapper.vm;
      expect(typeof vm.getFields).toBe('function');
    });
  });

  describe('initial state', () => {
    it('should initialize with empty model when no modelValue provided', () => {
      const wrapper = mount(JsonEditor, {
        props: {
          schema: mockSchema
        }
      });

      const vm = wrapper.vm;
      const fields = vm.getFields();
      expect(fields).toBeDefined();
    });
  });
});