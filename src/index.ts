import JsonEditor from "./JsonEditor.vue";
import type { JsonEditorStatic } from "./types/static";

// Export the component（default 保持原始组件类型，Vue SFC 工具链依赖此形态）
export default JsonEditor;

// Named export：cast 为带 setComponent 静态方法的类型，消费侧可直接
// `import { JsonEditor } from 'vue-json-ui-editor'; JsonEditor.setComponent(...)` 无需 as any。
// （setComponent 在 JsonEditor.vue 末尾已挂载到组件对象，这里仅补类型。）
const JsonEditorWithStatic = JsonEditor as typeof JsonEditor & JsonEditorStatic;
export { JsonEditorWithStatic as JsonEditor };

// Export types
export * from "./types";
export type { JsonEditorInstance, JsonEditorStatic } from "./types/static";
// array renderer（独立模块，可单独复用）
export { createArrayRenderer } from "./array-renderer";
export type { ArrayRendererDeps, ArrayRenderer } from "./array-renderer";
