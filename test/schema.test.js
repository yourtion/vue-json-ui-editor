'use strict';

import { shallow } from 'vue-test-utils';
import { createRenderer } from 'vue-server-renderer';

import JsonEditorLib from '../lib/json-editor.min.js';
import JsonEditorSrc from '@/JsonEditor.vue';
const JsonEditor = process.env.TEST_LIB ? JsonEditorLib : JsonEditorSrc;

const schema = Object.freeze(require('./data/signup.json'));

describe('schema', () => {
  const model = {};
  const wrapper = shallow(JsonEditor, {
    propsData: { schema, model },
  });
  const component = wrapper.vm;

  const form = component.$el.getElementsByTagName('form')[0];
  const inputs = form.elements;
  const button = form.getElementsByTagName('button')[0];

  const attr = (input, name) => input.getAttribute(name);

  describe('input', () => {
    for (const fieldName in schema.properties) {
      const field = schema.properties[fieldName];

      if (field.visible === false) {
        it(`invisible input.${ fieldName } should be undefined`, () => {
          expect(inputs[fieldName]).toBe(undefined);
        });
        continue;
      }

      const input = inputs[fieldName];

      if (!field.attrs) {
        field.attrs = {};
      }

      field.attrs.name = fieldName;

      if (field.type === 'boolean') {
        field.attrs.type = 'checkbox';
      }

      if (field.minLength) {
        field.attrs.minlength = field.minLength;
      }

      if (field.maxLength) {
        field.attrs.maxlength = field.maxLength;
      }

      if (field.required) {
        field.attrs.required = true;

        if (field.attrs.placeholder) {
          field.attrs.placeholder += ' *';
        }
      }

      describe(fieldName, () => {
        for (const attrName in field.attrs) {
          it(`should have attribute '${ attrName }'`, () => {
            expect(attr(input, attrName)).toMatch(new RegExp(`${ field.attrs[attrName] }`));
          });
        }
      });
    }
  });

  it('should have a submit button', () => {
    expect(attr(button, 'type')).toBe('submit');
  });

  it('should have a button with Submit label', () => {
    expect(attr(button, 'label')).toBe('Submit');
    expect(button.innerHTML).toBe('Submit');
  });

  test('Snapshot', done => {
    const renderer = createRenderer();
    renderer.renderToString(wrapper.vm, (err, str) => {
      if (err) throw new Error(err);
      expect(str).toMatchSnapshot();
      done();
    });
  });

});
