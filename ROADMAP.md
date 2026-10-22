# 迭代建议

本轮以 main 分支 8eba3c3（3.1.0）为基线。Vue 3 已完成，不安排框架迁移。

## 本轮落地

- schema 解析不再改写 `properties[*].name/required` 或 `attrs`；公开 `parseSchema` 提供输入模型隔离。
- 响应式字段树、动态 attrs、原生 number/boolean/enum 类型修正，保留 schema 更新时的输入数据。
- 明确渲染与校验边界；提供 `inspectSchema`，不支持的 MCP schema 回退 JSON。
- 对象数组默认值、嵌套字段、readOnly、增删上限/下限修复；路径输入和原型链保护。
- MCP / Agent 示例与 Ajv 校验、回归测试；CommonJS 产物使用 `.cjs`，适配 package `type: module`；补发 static.d.ts 和公开回调类型，增加包消费检查。

## 后续优先级

| 优先级 | 迭代项 | 当前证据 / 收益 | 建议验收 |
| --- | --- | --- | --- |
| P1 | 区分可选字段未填写 / 空值，提供 immutable model 模式 | 组件仍共享初始 modelValue 引用，且会初始化全部可见叶子；MCP optional 参数容易多传 | 输入不污染父对象；unset 不出现在 payload；reset 和父数据替换语义明确 |
| P1 | JSON Pointer 取代内部点分路径 | 当前 `field.name.split('.')` 限制了合法 JSON 键名 | 点号、空键、`$`、数字对象键与数组索引全部可往返；提供旧路径兼容层 |
| P1 | 基本类型数组、动态键值对象控件 | 当前只支持对象数组；`additionalProperties` 只能回退 JSON | 增删/重命名键、重复键提示、item/value schema 校验，且不丢未知字段 |
| P1 | 统一 validation adapter 和字段错误插槽 | 当前 `checkValidity`、UI 库 validate、外部 Ajv 是三套接口 | JSON Pointer 错误映射字段；嵌套数组可定位；异步校验防止旧结果覆盖 |
| P2 | 标准 $ref 和组合 schema 适配层 | parser 历史 oneOf/anyOf 语义不是规范分支 | 本地引用、递归上限、分支切换与数据保留策略；不隐式发起网络请求 |
| P2 | 大表单性能和稳定数组行身份 | array-renderer 在 render 中重新解析每一行，并以位置匹配 vnode | 100/1000 行基准；只解析变化行；删除行后控件内部状态不串位 |
| P2 | 组件拆分与可访问性 | JsonEditor.vue 集中注册、事件和渲染；数组容器缺完整语义 | 分离原生/组件绑定；键盘操作、错误关联、嵌套标题和焦点回归测试 |
| P2 | 发布与 CI 加固 | 原项目无 CI workflow；check 中 lint 会写文件；Node 包入口需消费测试 | PR 跑 type-check/test/build；只读格式检查；npm pack 后测试 ESM/CJS/类型消费 |
| P3 | 示例包拆分与依赖维护 | Element Plus 示例会让 demo 包较大；仓库提交了构建 docs 资产 | 示例按需加载；demo 和库各自预算；定期更新测试/构建工具并做兼容验证 |

建议先把本轮作为兼容性修复评审，后续 P1 中涉及模型语义的改动通过 opt-in API 或大版本推进。
