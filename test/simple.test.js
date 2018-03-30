'use strict';

import { shallow } from 'vue-test-utils';
import { createRenderer } from 'vue-server-renderer';

import JsonEditorLib from '../lib/json-editor.min.js';
import JsonEditorSrc from '@/JsonEditor.vue';
const JsonEditor = process.env.TEST_LIB ? JsonEditorLib : JsonEditorSrc;

const schema = Object.freeze(require('./data/simple.json'));
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
    const wrapper = shallow(JsonEditor, {
      propsData: { schema },
    });
    expect(wrapper.isVueInstance()).toBeTruthy();
  });

  it('Snapshot', done => {
    const wrapper = shallow(JsonEditor, {
      propsData: { schema },
    });
    const renderer = createRenderer();
    renderer.renderToString(wrapper.vm, (err, str) => {
      if (err) throw new Error(err);
      expect(str).toMatchSnapshot();
      done();
    });
  });

  describe('Mount with data and set data', () => {
    const wrapper = shallow(JsonEditor, {
      propsData: { schema, value: model },
    });
    const component = wrapper.vm;
    expect(wrapper.isVueInstance()).toBeTruthy();
    const form = component.$el.getElementsByTagName('form')[0];
    const { name, lists, email } = form.elements;

    it('get mounted data', () => {
      expect(name.getAttribute('value')).toBe(model.name);
      expect(lists.getAttribute('value')).toBe(model.lists[0]);
    });

    it('update value by setData', () => {
      wrapper.setData({ value: model2 });
      expect(email.getAttribute('value')).toBe(model2.email);
      expect(name.getAttribute('value')).toBe(model2.name);
    });
  });

});
