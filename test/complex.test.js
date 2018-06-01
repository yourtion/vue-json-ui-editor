'use strict';

import { shallowMount } from '@vue/test-utils';
import { createRenderer } from 'vue-server-renderer';

const packPath = process.env.TEST_LIB ? '../lib/json-editor.min.js' : '../src/JsonEditor.vue';
const pack = require(packPath);
const JsonEditor = pack.default;

const schema = Object.freeze(require('./data/complex.json'));

describe('Component', () => {
  it('Mount', () => {
    const wrapper = shallowMount(JsonEditor, {
      propsData: { schema },
    });
    expect(wrapper.isVueInstance()).toBeTruthy();
  });

  it('Snapshot', done => {
    const wrapper = shallowMount(JsonEditor, {
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
