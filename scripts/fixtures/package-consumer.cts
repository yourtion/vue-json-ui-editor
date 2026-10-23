import Package = require('vue-json-ui-editor');
import type { Component as CjsComponent } from 'vue';

const requiredComponent: CjsComponent = Package.default;
Package.JsonEditor.setComponent('text', 'input', ({ field }) => ({ placeholder: field.label }));
// @ts-expect-error The require namespace must retain typed exports.
Package.JsonEditor.setComponent('text', 42);
void requiredComponent;
