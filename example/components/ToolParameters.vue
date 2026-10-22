<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue';
import type { ValidateFunction } from 'ajv';
import JsonEditor from '../../src/JsonEditor.vue';
import type { ComponentsMap } from '../../src/types';
import { compileParameters, demoTools, prepareTool } from '../tool-parameters';

// Per-instance registrations keep this example independent of the Element Plus demo.
const nativeComponents: ComponentsMap = Object.fromEntries([
  ['form', 'form'], ['label', 'label'], ['title', 'h2'], ['description', 'p'],
  ['text', 'input'], ['email', 'input'], ['number', 'input'], ['checkbox', 'input'],
  ['select', 'select'], ['option', 'option'], ['error', 'div'],
].map(([key, component]) => [key, { component, option: { native: true } }]));
nativeComponents.arrayadd = { component: 'button', option: { native: true, type: 'button', label: '添加条件' } };
nativeComponents.arrayremove = { component: 'button', option: { native: true, type: 'button', label: '删除' } };

const selected = ref(0);
const prepared = computed(() => prepareTool(demoTools[selected.value]));
const model = ref<Record<string, unknown>>({});
const raw = ref('{}');
const preferJson = ref(false);
const useJson = computed(() => preferJson.value || !prepared.value.support.supported);
const errors = ref<string[]>([]);
const result = ref('');
const validator = shallowRef<ValidateFunction>();
const schemaError = ref('');

watch(prepared, (tool) => {
  model.value = tool.model;
  raw.value = JSON.stringify(tool.model, null, 2);
  preferJson.value = false;
  errors.value = [];
  result.value = '';
  schemaError.value = '';
  validator.value = undefined;
  try {
    validator.value = compileParameters(tool.schema);
  } catch (error) {
    schemaError.value = `Schema 无法校验：${String(error)}`;
  }
}, { immediate: true });

watch(model, () => { result.value = ''; errors.value = []; }, { deep: true });
watch(raw, () => { result.value = ''; errors.value = []; });

function toggleMode() {
  if (!useJson.value) {
    raw.value = JSON.stringify(model.value, null, 2);
    preferJson.value = true;
  } else {
    try {
      const value = JSON.parse(raw.value);
      if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error('参数必须是 JSON 对象');
      model.value = value;
      preferJson.value = false;
      errors.value = [];
    } catch (error) { errors.value = [String(error)]; }
  }
}

function submit() {
  result.value = '';
  errors.value = [];
  if (!validator.value) return;
  let args: unknown;
  try { args = useJson.value ? JSON.parse(raw.value) : model.value; }
  catch (error) { errors.value = [`JSON 解析失败：${String(error)}`]; return; }
  if (!validator.value(args)) {
    errors.value = (validator.value.errors || []).map(error => `${error.instancePath || '/'} ${error.message}`);
    return;
  }
  // Preview only. An application can pass these params to its MCP/Agent client.
  result.value = JSON.stringify({ name: prepared.value.name, arguments: args }, null, 2);
}
</script>

<template>
  <section class="tool-parameters">
    <h1>MCP / Agent 参数配置</h1>
    <label class="tool-picker">工具
      <select v-model="selected" data-testid="tool-picker">
        <option v-for="(tool, index) in demoTools" :key="index" :value="index">
          {{ 'inputSchema' in tool ? tool.name : tool.function.name }}
        </option>
      </select>
    </label>
    <p>{{ prepared.description }}</p>
    <p v-if="!prepared.support.supported" role="status">这个 schema 使用 JSON 编辑模式。</p>
    <details v-if="prepared.support.issues.length">
      <summary>查看表单不支持的字段</summary>
      <ul><li v-for="issue in prepared.support.issues" :key="issue.path">{{ issue.path }}：{{ issue.message }}</li></ul>
    </details>
    <button v-if="prepared.support.supported" type="button" @click="toggleMode">
      {{ useJson ? '切换表单' : '编辑 JSON' }}
    </button>
    <div class="parameter-columns">
      <div>
        <textarea v-if="useJson" v-model="raw" aria-label="JSON 参数" rows="16" spellcheck="false" />
        <JsonEditor v-else :key="selected" v-model="model" :schema="prepared.schema" :components="nativeComponents" no-validate @submit="submit">
          <button type="submit" :disabled="!!schemaError">校验并生成参数</button>
        </JsonEditor>
        <button v-if="useJson" type="button" :disabled="!!schemaError" @click="submit">校验并生成参数</button>
        <p v-if="schemaError" role="alert">{{ schemaError }}</p>
        <ul v-if="errors.length" role="alert"><li v-for="error in errors" :key="error">{{ error }}</li></ul>
        <p>生成结果仅供预览，不会执行工具。</p>
        <pre v-if="result" data-testid="result">{{ result }}</pre>
      </div>
      <details open><summary>原始 JSON Schema</summary><pre>{{ JSON.stringify(prepared.schema, null, 2) }}</pre></details>
    </div>
  </section>
</template>

<style scoped>
.tool-parameters { max-width: 1100px; margin: 24px auto; padding: 24px; text-align: left; }
.tool-picker { display: flex; align-items: center; gap: 12px; }
.parameter-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 20px; }
pre { white-space: pre-wrap; overflow-wrap: anywhere; background: #f4f6f8; padding: 16px; border-radius: 8px; }
textarea { box-sizing: border-box; width: 100%; font-family: monospace; }
button, input, select { padding: 8px; margin: 4px; }
:deep(form label) { display: block; margin: 12px 0; }
:deep(form input), :deep(form select) { margin-left: 12px; padding: 6px; }
:deep(.json-editor-array-row) { padding: 8px; border-bottom: 1px solid #ddd; }
[role="alert"] { color: #b42318; }
@media (max-width: 760px) { .parameter-columns { grid-template-columns: 1fr; } }
</style>
