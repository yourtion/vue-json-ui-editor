

import { mount } from '@vue/test-utils';

import JsonEditor from '../src/JsonEditor.vue';
import schema from './data/simple.json';

const model = {
  name: 'Yourtion',
  lists: ['Promotion'],
};

const model2 = {
  name: 'YourtionGuo',
  email: 'yourtion@gmail.com',
};

describe('Component', () => {
  it('Mount', () => {
    const wrapper = mount(JsonEditor, {
      props: { schema, modelValue: {} },
    });
    expect(wrapper.vm).toBeTruthy();
  });

  it('renders the expected top-level structure', () => {
    const wrapper = mount(JsonEditor, {
      props: { schema, modelValue: {} },
    });
    // master renders: <div><form>... with title from the schema.
    expect(wrapper.find('form').exists()).toBe(true);
    // schema has a title (see data/simple.json) -> rendered as <h1> by default
    expect(wrapper.find('h1').exists()).toBe(true);
    // at least one field rendered as an input
    expect(wrapper.findAll('input').length).toBeGreaterThan(0);
  });

  describe('Mount with data', () => {
    it('should render with initial data', () => {
      const wrapper = mount(JsonEditor, {
        props: { schema, modelValue: model },
      });

      // Check that form exists
      const form = wrapper.find('form');
      expect(form.exists()).toBe(true);

      // master binds the modelValue onto each input's value attribute; the
      // name field is the first input and should carry the initial value.
      const inputs = wrapper.findAll('input');
      expect(inputs.length).toBeGreaterThan(0);
      const nameValue = inputs[0].attributes('value');
      expect(nameValue).toBe('Yourtion');
    });

    it('should update when modelValue changes', async () => {
      const wrapper = mount(JsonEditor, {
        props: { schema, modelValue: model },
      });

      // Update props
      await wrapper.setProps({ modelValue: model2 });

      // Check that component still works
      const form = wrapper.find('form');
      expect(form.exists()).toBe(true);
    });
  });

});
