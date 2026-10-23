# JSON Schema 支持范围

`vue-json-ui-editor` 3.x 使用 Vue 3。它负责把一部分 schema 渲染成可编辑表单；
`checkValidity()` 是原生 HTML 约束检查，`validate()` 可委托 UI 库，二者都不代表完整 JSON Schema 校验。
`inspectSchema` 返回渲染能力诊断；JSON 回退和完整参数校验由接入应用实现，组件不会自动切换编辑模式。

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
| `format` | email / uri 映射原生输入；其他格式默认文本 | 使用支持所需 format 的外部校验器 |
| `array` + `items: {type: object, properties}` | 增删行，支持嵌套对象/数组 | minItems / maxItems 限制增删按钮；初始无效数据仍需校验 |
| `additionalProperties: false` | 只渲染声明字段，不自动删除额外数据 | 校验器拒绝额外键 |
| `additionalProperties: true` / schema、`patternProperties` | 不生成动态键控件，`inspectSchema` 报告并回退 JSON | 按原 schema 校验字典值及键约束 |
| `exclusiveMinimum` / `exclusiveMaximum` / `multipleOf` / `uniqueItems` / `minProperties` / `maxProperties` | 可渲染其字段，但没有完整 UI 约束 | 仅通过外部校验器检查 |
| 标准 `oneOf` / `anyOf` / `allOf` / `not`、条件/依赖、`const` | 不支持表单合成，回退 JSON | 原 schema 交给校验器 |
| `$ref` / `$defs` / `definitions` | 编辑器不解引用，回退 JSON | 由外部校验器解析和校验引用 |
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
`attrs` / `component` 等控件配置应来自可信应用；远端工具 schema 接入时应过滤这些 UI 扩展。

动态 `attrs` 会传给控件；组件注册的 option / option 回调优先，绑定值和输入事件由编辑器管理。
用 Vue `reactive` 或 `ref` 更新 schema 可驱动控件增删、选项和属性变化。
字段移除/隐藏不会清除数据；应用决定是否清理。切换不同工具建议用 `:key="tool.name"`，
并替换参数对象，以隔离数据和 reset 初始快照。

字段路径目前用点号分隔，不支持属性名含点、以 `$` 开头、空字符串、可解释为整数的键名或 JavaScript 原型保留名。
能力检查会提示这些名称；路径工具拒绝原型链遍历。JSON 回退可保留这些原始键。

## 参数配置接入约定

用 `inspectSchema(schema)` 判断是否使用表单，再用 `parseSchema(schema, initialArguments)`
生成隔离的数据与字段。提交前使用匹配 dialect 的外部校验器检查原始 schema 和参数；
库本身不依赖 Ajv，也不执行 MCP / Agent 工具。

新建可选字段可能被初始化为空串、false 或空数组。需要精确区分省略、null 和空值时，
接入应用应提供 JSON 编辑或显式的字段启用控件。
