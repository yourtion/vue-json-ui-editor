'use strict';

import { shallowMount } from '@vue/test-utils';

import JsonEditor from '../src/JsonEditor.vue';
import schema from './data/complex.json';

describe('Component', () => {
  it('Mount', () => {
    const wrapper = shallowMount(JsonEditor, {
      propsData: { schema },
    });
    expect(wrapper.isVueInstance()).toBeTruthy();
  });

  it('Snapshot', () => {
    const wrapper = shallowMount(JsonEditor, {
      propsData: { schema },
    });
    expect(wrapper.html()).toMatchSnapshot();
  });

});
