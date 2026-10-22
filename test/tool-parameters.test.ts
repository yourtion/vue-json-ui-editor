import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import ToolParameters from '../example/components/ToolParameters.vue';
import { compileParameters, demoTools, prepareTool } from '../example/tool-parameters';

describe('MCP / Agent parameter integration', () => {
  it('adapts MCP inputSchema and Agent parameters without mutating definitions', () => {
    const before = JSON.stringify(demoTools);
    const mcp = prepareTool(demoTools[0]);
    const agent = prepareTool(demoTools[1]);
    expect(mcp.name).toBe('search_documents');
    expect(mcp.support.supported).toBe(true);
    expect(agent.name).toBe('configure_agent');
    expect(agent.model.budget.maxSteps).toBe(8);
    mcp.model.query = 'changed';
    expect(JSON.stringify(demoTools)).toBe(before);
    expect(prepareTool(demoTools[0]).model.query).toBe('Vue 3');
  });

  it('validates types, required fields, nested arrays and unknown keys without coercion', () => {
    const prepared = prepareTool(demoTools[0]);
    const validate = compileParameters(prepared.schema);
    expect(validate(prepared.model)).toBe(true);
    const bad = { ...prepared.model, limit: '10', extra: 'retained', filters: [{ field: 'tag' }] };
    const before = JSON.stringify(bad);
    expect(validate(bad)).toBe(false);
    expect(validate.errors?.map(error => error.keyword)).toEqual(expect.arrayContaining(['type', 'required', 'additionalProperties']));
    expect(JSON.stringify(bad)).toBe(before);
  });

  it('validates draft-07 separately and fails on unknown dialects / unresolved refs', () => {
    const validate = compileParameters({ $schema: 'http://json-schema.org/draft-07/schema#', type: 'object', properties: { email: { type: 'string', format: 'email' } } });
    expect(validate({ email: 'bad' })).toBe(false);
    expect(() => compileParameters({ $schema: 'https://example.invalid/schema', type: 'object' })).toThrow();
    expect(() => compileParameters({ type: 'object', $ref: 'https://example.invalid/ref' })).toThrow();
  });

  it('generates typed MCP arguments and clears them on edits or tool changes', async () => {
    const wrapper = mount(ToolParameters);
    await wrapper.find('input[name="limit"]').setValue('4');
    await wrapper.find('input[name="includeArchived"]').setValue(true);
    await wrapper.find('form').trigger('submit');
    expect(JSON.parse(wrapper.find('[data-testid="result"]').text())).toMatchObject({ name: 'search_documents', arguments: { limit: 4, includeArchived: true } });
    await wrapper.find('input[name="query"]').setValue('updated');
    expect(wrapper.find('[data-testid="result"]').exists()).toBe(false);
    await wrapper.find('input[name="limit"]').setValue('101');
    await wrapper.find('form').trigger('submit');
    expect(wrapper.find('[role="alert"]').text()).toContain('100');
    await wrapper.find('[data-testid="tool-picker"]').setValue('1');
    expect(wrapper.find('input[name="budget.maxSteps"]').exists()).toBe(true);
    expect(wrapper.find('input[name="query"]').exists()).toBe(false);
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });

  it('falls back to JSON for dynamic keys and blocks malformed / invalid arguments', async () => {
    const wrapper = mount(ToolParameters);
    await wrapper.find('[data-testid="tool-picker"]').setValue('2');
    expect(wrapper.find('form').exists()).toBe(false);
    expect(wrapper.find('[role="status"]').text()).toContain('JSON');
    const submit = wrapper.findAll('button').find(button => button.text().includes('校验'))!;
    await wrapper.find('textarea').setValue('{bad');
    await submit.trigger('click');
    expect(wrapper.find('[role="alert"]').text()).toContain('JSON 解析失败');
    await wrapper.find('textarea').setValue('{"headers":{"x-count":2}}');
    await submit.trigger('click');
    expect(wrapper.find('[data-testid="result"]').exists()).toBe(false);
    await wrapper.find('textarea').setValue('{"headers":{"x-region":"cn"}}');
    await submit.trigger('click');
    expect(JSON.parse(wrapper.find('[data-testid="result"]').text())).toEqual({ name: 'custom_headers', arguments: { headers: { 'x-region': 'cn' } } });
  });
});
