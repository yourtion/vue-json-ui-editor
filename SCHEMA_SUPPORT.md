# JSON Schema 支持范围与 MCP / Agent 接入

`vue-json-ui-editor` 3.x 使用 Vue 3。它负责把一部分 schema 渲染成可编辑表单；
`checkValidity()` 是原生 HTML 约束检查，`validate()` 可委托 UI 库，二者都不代表完整 JSON Schema 校验。

## 支持矩阵

| 能力 | 当前行为 | 参数提交前的要求 |
| --- | --- | --- |
| 根 `type: object` + `properties` | 渲染已声明属性；嵌套对象有标题、描述 | 独立校验原始 schema |
| `string` / `integer` / `number` / `boolean` | 文本、数字、复选框；原生输入输出对应 JSON 类型 | 数字清空为 `''`，校验器负责报错；整数不做静默取整 |
| 标量 `enum` | select，保留 number / boolean 值 | 对象、数组、null 枚举回退 JSON |
| 嵌套 `required: string[]` | 显示必填；原生文本等控件传递 required | JSON Schema 的存在性与 HTML 非空语义不同；boolean 必填允许 false |
| `title` / `description` | 标签和说明 | 仅注解 |
| 叶子和对象数组的 `default` | 缺少字段时复制默认值；保留 0 / false；不覆盖已有值 | 这是编辑器初始化行为，不是标准规定的自动补值；对象容器 default 不展开 |
| `readOnly` | 禁用控件；向对象、数组的子字段传递 | 注解，不代替服务端授权 |
| `minLength` / `maxLength` / `pattern` | 原生控件约束，含 0 边界 | UI 库需自行映射；正则语义由所选校验器确认 |
| `minimum` / `maximum` | 原生 min / max；integer step=1，number step=any | Ajv 校验数值范围和整数类型 |
| `format` | email / uri 映射原生输入；其他格式默认文本 | 示例使用 ajv-formats；未知格式编译错误会阻止提交 |
| `array` + `items: {type: object, properties}` | 增删行，支持嵌套对象/数组 | minItems / maxItems 限制增删按钮；初始无效数据仍需校验 |
| `additionalProperties: false` | 只渲染声明字段，不自动删除额外数据 | 校验器拒绝额外键 |
| `additionalProperties: true` / schema、`patternProperties` | 不生成动态键控件，`inspectSchema` 报告并回退 JSON | 按原 schema 校验字典值及键约束 |
| `exclusiveMinimum` / `exclusiveMaximum` / `multipleOf` / `uniqueItems` / `minProperties` / `maxProperties` | 可渲染其字段，但没有完整 UI 约束 | 仅通过外部校验器检查 |
| 标准 `oneOf` / `anyOf` / `allOf` / `not`、条件/依赖、`const` | 不支持表单合成，回退 JSON | 原 schema 交给校验器 |
| `$ref` / `$defs` / `definitions` | 编辑器不解引用，回退 JSON | 示例支持 Ajv 能解析的本地引用；外部引用未注册会阻止提交，不自动联网 |
| 基本类型数组、tuple / `prefixItems`、null、type union、boolean schema | 不支持对应表单，回退 JSON | 原 schema 交给校验器 |
| 省略 `type`、未知关键字 | 保守回退 JSON | `inspectSchema` 是能力检查，不是 schema 合法性检查 |

没有声明 `additionalProperties` 时，标准默认允许额外键；表单只显示 `properties`，
不会删除模型里的额外键。需要编辑这些键时使用 JSON 模式。
`inspectSchema(...).supported === true` 只表示已知渲染结构，**不表示 schema 或参数有效**。
支持矩阵并不宣称实现 draft-07 或 2020-12 的全部规范。

## 历史 UI 扩展

`attrs`、`component`、`disabled`、`visible`、`checked`、`name`、字段级 `required: true` 是项目扩展。
历史 `oneOf: ['a', 'b']` / `anyOf: [{value, label}]` 是 radio/checkbox 选项列表，
与标准的 schema 分支组合语义不同。旧 API 保留兼容；`inspectSchema` 不把这些选项列表当作标准支持。
标准 enum 的值是数据本身，`{value, label}` 选项对象也是历史扩展。

动态 `attrs` 会传给控件；组件注册的 option / option 回调优先，绑定值和输入事件由编辑器管理。
用 Vue `reactive` 或 `ref` 更新 schema 可驱动控件增删、选项和属性变化。
字段移除/隐藏不会清除数据；应用决定是否清理。切换不同工具建议用 `:key="tool.name"`，
并替换参数对象，以隔离数据和 reset 初始快照。

字段路径目前用点号分隔，不支持属性名含点、以 `$` 开头、空字符串、可解释为整数的键名或 JavaScript 原型保留名。
能力检查会提示这些名称；路径工具拒绝原型链遍历。JSON 回退可保留这些原始键。

## MCP / Agent 接入

完整示例：[`example/components/ToolParameters.vue`](example/components/ToolParameters.vue)，
适配和校验：[`example/tool-parameters.ts`](example/tool-parameters.ts)。

1. 从 MCP `tools/list` 读取 `tool.inputSchema`；Agent 函数工具读取 `function.parameters`。
2. `inspectSchema(schema)` 决定表单或 JSON 模式，并返回不支持的关键字及 JSON Pointer。
3. 表单用 `parseSchema(schema, initialArguments)` 生成隔离的数据和字段描述；解析不修改输入。
4. 用匹配 dialect 的校验器编译原始 schema。示例无 `$schema` 时用 Ajv 2020-12，显式 draft-07 用对应实例；其他 dialect 编译失败时阻止提交。
5. 提交时先解析 JSON，再校验。示例不开启 coerceTypes / useDefaults / removeAdditional，不静默改参数。
6. 校验通过生成 `{name, arguments}`；MCP 应用可传给 `client.callTool(...)`，Agent 调用按其 SDK 的协议封装。

```ts
const candidate = { name: selectedTool.name, arguments: model };
if (!validate(candidate.arguments)) {
  // 展示 validate.errors，暂不调用工具
  return;
}
// 在业务应用明确执行操作的处理器内：
const result = await client.callTool(candidate);
```

仓库示例只预览参数，未连接 MCP server，也不执行 Agent。Ajv 是开发依赖，发布库不引入校验器体积。
接入现有 UI 库时，使用实例级 `components`，避免全局 setComponent 影响其他表单。
新建可选字段可能被初始化为空串/false/空数组；需要区分“缺省”和“已填写空值”的应用目前应使用 JSON 模式。

## 回归覆盖

- 深冻结 schema、共享 attrs/default、嵌套 required、重复解析、同一个 schema 多实例。
- schema 原地编辑、属性增删、visible/disabled 更新、输入 refs 清理、父模型替换。
- 原生数字、布尔值、0/false 枚举、数组行约束和嵌套字段。
- MCP/Agent 适配、工具切换、JSON 解析失败、参数校验失败、有效参数生成。
- 不支持构造的诊断位置、原型路径保护、路径数组不被消耗。

## 包入口

ESM 入口保持 `dist/vue-json-ui-editor.es.js`；CommonJS/UMD 入口为
`dist/vue-json-ui-editor.umd.cjs`，通过 `.cjs` 避免在 `type: module` 包中被误判为 ESM。
使用包名 import/require 无需调整；直接引用旧 `.umd.js` 文件路径的使用方需要更新路径。
