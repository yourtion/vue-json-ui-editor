'use strict';

import { shallow } from '@vue/test-utils';
import { createRenderer } from 'vue-server-renderer';

const packPath = process.env.TEST_LIB ? '../lib/json-editor.min.js' : '../src/JsonEditor.vue';
const pack = require(packPath);
const JsonEditor = pack.default;

const schema = Object.freeze(require('./data/complex.json'));
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

});
