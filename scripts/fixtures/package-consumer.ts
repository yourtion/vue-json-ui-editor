import Editor, {
  JsonEditor,
  type JsonEditorInstance,
  type JsonSchema,
} from 'vue-json-ui-editor';

const schema: JsonSchema = {
  type: 'object', required: ['limit'], properties: { limit: { type: 'integer', default: 0 } },
};
JsonEditor.setComponent('text', 'input', ({ field, vm }) => ({
  placeholder: field.label,
  disabled: Boolean(vm.model.locked),
}));
const instance = {} as JsonEditorInstance;
void [Editor, schema, instance];
