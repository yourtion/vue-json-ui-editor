

import { shallowMount } from '@vue/test-utils';

import JsonEditor from '../src/JsonEditor.vue';
import schema from './data/simple.json';
const model = {
  name: 'Yourtion',
  lists: [ 'Promotion' ],
};
const model2 = {
  name: 'YourtionGuo',
  email: 'yourtion@gmail.com',
};

describe('Component', () => {
  it('Mount', () => {
    const wrapper = shallowMount(JsonEditor, {
      propsData: { schema },
    });
    expect(wrapper.vm).toBeTruthy();
  });

  it('Snapshot', () => {
    const wrapper = shallowMount(JsonEditor, {
      propsData: { schema },
    });
    expect(wrapper.html()).toMatchSnapshot();
  });

  describe('Mount with data and set data', () => {
    const wrapper = shallowMount(JsonEditor, {
      propsData: { schema, value: model },
    });
    const component = wrapper.vm;
    expect(wrapper.vm).toBeTruthy();
    const form = component.$el.getElementsByTagName('form')[0];
    const { name, lists, email } = form.elements;

    it('get mounted data', () => {
      expect(name.getAttribute('value')).toBe(model.name);
      expect(lists.getAttribute('value')).toBe(model.lists[0]);
    });

    it('update value by setData', async () => {
      wrapper.setData({ value: model2 });
      await wrapper.vm.$nextTick();
      expect(email.getAttribute('value')).toBe(model2.email);
      expect(name.getAttribute('value')).toBe(model2.name);
    });
  });

});
