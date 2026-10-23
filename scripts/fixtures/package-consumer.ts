import Editor, {
  JsonEditor,
  type JsonEditorInstance,
  type JsonSchema,
} from 'vue-json-ui-editor';
import { h, type Component } from 'vue';

const schema: JsonSchema = {
  type: 'object', required: ['limit'], properties: { limit: { type: 'integer', default: 0 } },
};
JsonEditor.setComponent('text', 'input', ({ field, vm }) => ({
  placeholder: field.label,
  disabled: Boolean(vm.model.locked),
}));
const instance = {} as JsonEditorInstance;
const component: Component = Editor;
h(JsonEditor, { schema });
// @ts-expect-error Keep the public schema type checked instead of degrading to any.
const invalidSchema: JsonSchema = { type: 42 };
// @ts-expect-error The component registration argument must retain its public type.
JsonEditor.setComponent('text', 42);
void [component, schema, instance, invalidSchema];
