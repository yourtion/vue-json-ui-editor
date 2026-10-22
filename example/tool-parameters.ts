import Ajv from 'ajv';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { parseSchema } from '../src/parser';
import { inspectSchema } from '../src/schema-support';
import type { JsonSchema } from '../src/types';
import { deepClone } from '../src/utils';

export type ToolDefinition =
  | { name: string; description?: string; inputSchema: JsonSchema }
  | { type: 'function'; function: { name: string; description?: string; parameters: JsonSchema } };

export function prepareTool(tool: ToolDefinition) {
  const definition = 'inputSchema' in tool ? tool : tool.function;
  const schema = deepClone('inputSchema' in tool ? tool.inputSchema : tool.function.parameters);
  const support = inspectSchema(schema);
  return {
    name: definition.name,
    description: definition.description,
    schema,
    support,
    model: support.supported ? parseSchema(schema).model : {},
  };
}

/** Compile once per schema. No coercion, default insertion, or property removal. */
export function compileParameters(schema: JsonSchema) {
  const options = { allErrors: true, strict: true };
  const validator = schema.$schema?.includes('draft-07') ? new Ajv(options) : new Ajv2020(options);
  addFormats(validator);
  return validator.compile(schema);
}

export const demoTools: ToolDefinition[] = [
  {
    name: 'search_documents',
    description: 'MCP 工具：搜索文档，生成 tools/call 的参数。',
    inputSchema: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object', additionalProperties: false, required: ['query', 'limit', 'includeArchived'],
      properties: {
        query: { type: 'string', title: '关键词', minLength: 1, default: 'Vue 3' },
        limit: { type: 'integer', title: '结果数', minimum: 1, maximum: 100, default: 10 },
        includeArchived: { type: 'boolean', title: '包含归档', default: false },
        order: { type: 'string', title: '排序', enum: ['relevance', 'newest'], default: 'relevance' },
        filters: { type: 'array', title: '筛选条件', maxItems: 5, items: {
          type: 'object', additionalProperties: false, required: ['field', 'value'], properties: {
            field: { type: 'string', title: '字段', enum: ['author', 'tag'], default: 'tag' },
            value: { type: 'string', title: '值', minLength: 1 },
          },
        } },
      },
    },
  },
  {
    type: 'function', function: {
      name: 'configure_agent', description: 'Agent function.parameters：模型和运行预算配置。',
      parameters: {
        type: 'object', additionalProperties: false, required: ['model', 'budget'], properties: {
          model: { type: 'string', title: '模型', enum: ['fast', 'balanced', 'reasoning'], default: 'balanced' },
          budget: { type: 'object', title: '预算', additionalProperties: false, required: ['maxSteps'], properties: {
            maxSteps: { type: 'integer', title: '最大步骤', minimum: 1, maximum: 50, default: 8 },
            temperature: { type: 'number', title: '温度', minimum: 0, maximum: 2, default: 0.5 },
          } },
        },
      },
    },
  },
  {
    name: 'custom_headers', description: '动态键对象：使用 JSON 编辑并按原 schema 校验。',
    inputSchema: {
      type: 'object', required: ['headers'], additionalProperties: false, properties: {
        headers: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
  },
];
