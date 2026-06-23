
import { mount } from '@vue/test-utils';

import JsonEditor from '../src/JsonEditor.vue';
import schema from './data/complex.json';

describe('Component', () => {
  it('Mount', () => {
    const wrapper = mount(JsonEditor, {
      props: {
        schema: schema,
        modelValue: {}
      },
    });
    expect(wrapper.vm).toBeTruthy();
  });

  it('renders complex schema without crashing', () => {
    const wrapper = mount(JsonEditor, {
      props: {
        schema: schema,
        modelValue: {}
      },
    });
    // master renders the schema title and at least one field input.
    expect(wrapper.find('form').exists()).toBe(true);
    expect(wrapper.findAll('input').length).toBeGreaterThan(0);
  });

});
