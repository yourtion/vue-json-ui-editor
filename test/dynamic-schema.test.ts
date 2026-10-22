import { mount } from '@vue/test-utils';
import { nextTick, reactive } from 'vue';
import { describe, expect, it } from 'vitest';
import JsonEditor from '../src/JsonEditor.vue';
import type { JsonSchema, OptionContext } from '../src/types';

describe('dynamic schema and JSON value types', () => {
  it('keeps native input binding with dynamic option callbacks and untitled help text', async () => {
    const placeholder = reactive({ value: 'before' });
    const wrapper = mount(JsonEditor, { props: {
      schema: { type: 'object', properties: { query: { type: 'string', description: 'Search documentation' } } },
      modelValue: { query: 'Vue' },
      components: { text: { component: 'input', option: ({ field }: OptionContext) => ({ placeholder: placeholder.value, 'aria-label': field.name }) } },
    } });
    expect(wrapper.text()).toContain('Search documentation');
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('Vue');
    placeholder.value = 'after';
    await nextTick();
    expect(wrapper.find('input').attributes('placeholder')).toBe('after');
    await wrapper.find('input').setValue('MCP');
    expect((wrapper.vm as any).vm.model.query).toBe('MCP');
  });
  it('rerenders in-place schema edits with no unrelated model change', async () => {
    const schema = reactive<JsonSchema>({ type: 'object', required: ['name'], properties: {
      name: { type: 'string', title: 'Before', attrs: { placeholder: 'Before' } },
    } });
    const wrapper = mount(JsonEditor, { props: { schema, modelValue: { name: 'kept' } } });
    await nextTick();
    const property = schema.properties!.name;
    property.title = 'After';
    property.attrs = { placeholder: 'After', 'aria-label': 'Name', 'data-test': 'custom' };
    property.disabled = true;
    schema.required = [];
    await nextTick();
    expect(wrapper.text()).toContain('After');
    expect(wrapper.find('input').attributes()).toMatchObject({ placeholder: 'After', disabled: '', 'aria-label': 'Name' });
    expect(wrapper.find('input').attributes('required')).toBeUndefined();
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('kept');
    property.disabled = false;
    property.visible = false;
    await nextTick();
    expect(wrapper.find('input').exists()).toBe(false);
    expect(() => (wrapper.vm as any).input('name')).toThrow();
    property.visible = true;
    schema.properties!.extra = { type: 'string', default: 'added' };
    await nextTick();
    expect(wrapper.findAll('input')).toHaveLength(2);
    delete schema.properties!.extra;
    await nextTick();
    expect(wrapper.findAll('input')).toHaveLength(1);
    expect((wrapper.vm as any).vm.model.name).toBe('kept');
  });

  it('outputs numbers, booleans and typed enum choices from native controls', async () => {
    const wrapper = mount(JsonEditor, { props: { schema: { type: 'object', properties: {
      count: { type: 'integer', minimum: 0, maximum: 10 },
      active: { type: 'boolean', default: false },
      choice: { type: 'integer', enum: [0, 1] },
      enabled: { type: 'boolean', enum: [false, true] },
    } }, modelValue: {} } });
    await wrapper.find('input[type="number"]').setValue('3');
    await wrapper.find('input[type="checkbox"]').setValue(true);
    await wrapper.find('select[name="choice"]').setValue('0');
    await wrapper.find('select[name="enabled"]').setValue('false');
    expect((wrapper.vm as any).vm.model).toMatchObject({ count: 3, active: true, choice: 0, enabled: false });
    expect(wrapper.find('input[type="number"]').attributes()).toMatchObject({ min: '0', max: '10', step: '1' });
    await wrapper.find('input[type="number"]').setValue('');
    expect((wrapper.vm as any).vm.model.count).toBe('');
  });

  it('does not erase raw parent objects on updates or model replacement', async () => {
    const original = { name: 'original' };
    const wrapper = mount(JsonEditor, { props: { schema: { type: 'object', properties: { name: { type: 'string' } } }, modelValue: original } });
    await wrapper.find('input').setValue('edited');
    await nextTick();
    expect(original.name).toBe('edited');
    await wrapper.setProps({ modelValue: { name: 'replacement' } });
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('replacement');
    expect(wrapper.emitted('update:modelValue')).toHaveLength(1);
  });

  it('applies array size limits and inherited readOnly to row controls', async () => {
    const schema = reactive<JsonSchema>({ type: 'object', properties: { rows: {
      type: 'array', minItems: 1, maxItems: 2, items: { type: 'object', required: ['name'], properties: {
        name: { type: 'string', title: 'Name' },
        detail: { type: 'object', properties: { note: { type: 'string', title: 'Note' } } },
      } },
    } } });
    const wrapper = mount(JsonEditor, { props: { schema, modelValue: { rows: [{ name: 'Ada', detail: { note: 'kept' } }] } } });
    expect(wrapper.findAll('.json-editor-array-row input')).toHaveLength(2);
    expect(wrapper.find('.json-editor-array-remove').attributes('disabled')).toBeDefined();
    await wrapper.find('.json-editor-array-add').trigger('click');
    expect(wrapper.findAll('.json-editor-array-row')).toHaveLength(2);
    expect(wrapper.find('.json-editor-array-add').attributes('disabled')).toBeDefined();
    schema.properties!.rows.readOnly = true;
    await nextTick();
    expect(wrapper.findAll('.json-editor-array-row input').every(input => input.attributes('disabled') !== undefined)).toBe(true);
    expect(wrapper.findAll('.json-editor-array-remove').every(button => button.attributes('disabled') !== undefined)).toBe(true);
  });
});
