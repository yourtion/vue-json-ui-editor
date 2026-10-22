import Editor, {
  JsonEditor,
  inspectSchema,
  parseSchema,
  type JsonEditorInstance,
  type JsonSchema,
  type SchemaIssue,
} from 'vue-json-ui-editor';

const schema: JsonSchema = {
  type: 'object', properties: { nested: {
    type: 'object', required: ['limit'], properties: { limit: { type: 'integer', default: 0 } },
  } },
};
const issues: SchemaIssue[] = inspectSchema(schema).issues;
const parsed = parseSchema(schema);
JsonEditor.setComponent('text', 'input', ({ field, vm }) => ({
  placeholder: field.label,
  disabled: Boolean(vm.model.locked),
}));
const instance = {} as JsonEditorInstance;
void [Editor, issues, parsed, instance];
