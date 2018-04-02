'use strict';

const packPath = process.env.TEST_LIB ? '../lib/json-editor.min.js' : '../src/JsonEditor.vue';
const pack = require(packPath);
const JsonEditor = pack.default;

describe('JsonEditor', () => {

  describe('hook', () => {
    it('should have a created hook', () => {
      expect(typeof JsonEditor.created).toBe('function');
    });

    it('should have a mounted hook', () => {
      expect(typeof JsonEditor.mounted).toBe('function');
    });
  });

  describe('method', () => {
    it('should have a changed method', () => {
      expect(typeof JsonEditor.methods.changed).toBe('function');
    });

    it('should have a input method', () => {
      expect(typeof JsonEditor.methods.input).toBe('function');
    });

    it('should have a reset method', () => {
      expect(typeof JsonEditor.methods.reset).toBe('function');
    });

    it('should have a submit method', () => {
      expect(typeof JsonEditor.methods.submit).toBe('function');
    });

    it('should have a setErrorMessage method', () => {
      expect(typeof JsonEditor.methods.setErrorMessage).toBe('function');
    });

    it('should have a clearErrorMessage method', () => {
      expect(typeof JsonEditor.methods.clearErrorMessage).toBe('function');
    });
  });

  describe('data', () => {
    // Evaluate the results of functions in
    // the raw component options
    it('should set the correct default data', () => {
      expect(typeof JsonEditor.data).toBe('function');
      const defaultData = JsonEditor.data();

      expect(Object.keys(defaultData.default).length).toBe(0);
      // expect(defaultData.fields.length).toBe(0);
      expect(defaultData.error).toBe(null);
    });
  });


});
