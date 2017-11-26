'use strict';

import { mount } from 'vue-test-utils';
import { createRenderer } from 'vue-server-renderer';

import JsonEditorLib from '../lib/json-editor.min.js';
import JsonEditorSrc from '@/JsonEditor.vue';
const JsonEditor = process.env.TEST_LIB ? JsonEditorLib : JsonEditorSrc;

const schema = Object.freeze(require('./data/simple.json'));

describe('Component', () => {
  test('Mount Test', () => {
    const wrapper = mount(JsonEditor, {
      propsData: { schema },
    });
    expect(wrapper.isVueInstance()).toBeTruthy();
  });

  test('Snapshot', done => {
    const wrapper = mount(JsonEditor, {
      propsData: { schema },
    });
    const renderer = createRenderer();
    renderer.renderToString(wrapper.vm, (err, str) => {
      if (err) throw new Error(err);
      expect(str).toMatchSnapshot();
      done();
    });
  });
});
