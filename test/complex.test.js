'use strict';

import { shallowMount } from '@vue/test-utils';
import { renderToString } from '@vue/server-test-utils';

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

  it('Snapshot', () => {
    const renderedString = renderToString(JsonEditor, {
      propsData: { schema },
    });
    expect(renderedString).toMatchSnapshot();
  });

});
