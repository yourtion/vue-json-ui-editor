import { mount } from 'vue-test-utils';
import JsonEditorLib from '../lib/json-editor.min.js';
import JsonEditorSrc from '@/JsonEditor.vue';

const JsonEditor = process.env.TEST_LIB ? JsonEditorLib : JsonEditorSrc;

const schema = require('./simple.json');

describe('Component', () => {
  test('Mount Test', () => {
    const wrapper = mount(JsonEditor, {
      propsData: { schema },
    });
    expect(wrapper.isVueInstance()).toBeTruthy();
  });
});
