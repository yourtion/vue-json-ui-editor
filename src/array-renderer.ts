// src/array-renderer.ts
// object 数组（items: {type:object, properties}）增删行的独立渲染模块。
//
// 从 JsonEditor.vue 抽出，使 array 渲染逻辑可独立测试、复用、不与组件 setup 闭包耦合。
// 通过 createArrayRenderer(deps) 工厂注入组件侧依赖（model/emit/loadFields/renderInput 等），
// 模块内部用 vue 的 h 生成 vnode，调用方无需传 h。
import { h } from "vue";

// h() 的 children 类型在 vue 类型系统里较复杂（Child/RawChildren 互不兼容），
// 此模块统一用 any 承载 render 函数的 children，调用方（JsonEditor）传入的
// wrapChild/renderInput 本就是 vue 内部函数，类型安全由它们各自保证。
type Child = any;

import { loadFields } from "./parser";
import type { ComponentConfig, ComponentOption, Fields, FormField, JsonSchema } from "./types";
import type { RecordAny } from "./utils";
import { deepClone, getChild, setVal } from "./utils";

/**
 * JsonEditor 注入给 array-renderer 的依赖。
 * 这些是组件 setup 闭包内的函数/状态，通过工厂注入避免循环依赖与隐式耦合。
 */
export interface ArrayRendererDeps {
  /** 组件响应式 model（读写数组数据的源头） */
  model: RecordAny;
  /** 数组变更后通知父组件（emit update:modelValue） */
  onChange: () => void;
  /** 取已注册的组件配置（arrayadd/arrayremove 等） */
  getComp: (key: string) => ComponentConfig | undefined;
  /** 解析组件配置为可渲染的 component（string|Component） */
  resolveComp: (element: ComponentConfig | undefined) => string | object;
  /** 计算组件 props（option 对象或回调） */
  elementOptions: (
    element: ComponentConfig | undefined,
    extendingOptions?: RecordAny,
    field?: FormField,
    item?: RecordAny,
  ) => RecordAny;
  /** 包装子节点（native 用数组，组件用 slots 函数） */
  wrapChild: (element: ComponentConfig | undefined, child: unknown) => Child;
  /** 渲染单个字段为 vnode 数组（递归，用于行内子字段）。
   *  mutable：因 renderInput 与 renderer 互递归（renderInput 调 renderer.render，
   *  renderer.render 调 renderInput），创建 renderer 时此字段可先留空，
   *  由调用方在 renderInput 定义后回填。 */
  renderInput: (field: FormField, fieldName: string) => unknown[];
}

/** deps 的可变容器：供 JsonEditor 先创建 renderer、后回填 renderInput */
export type MutableArrayRendererDeps = {
  [K in keyof ArrayRendererDeps]: ArrayRendererDeps[K];
};

export interface ArrayRenderer {
  /** 渲染整个 array 字段（header + 行列表）为 vnode 数组 */
  render(field: FormField, fieldName: string): unknown[];
  /** 添加一行（push 空对象） */
  addRow(fieldName: string): void;
  /** 删除指定索引的行 */
  removeRow(fieldName: string, index: number): void;
}

/** 读取/初始化 fieldName 处的数组（不存在则创建空数组） */
function ensureArray(model: RecordAny, fieldName: string): unknown[] {
  const ns = fieldName.split(".");
  const cur = getChild(model, ns);
  if (Array.isArray(cur)) return cur;
  const arr: unknown[] = [];
  setVal(model, ns, arr);
  return arr;
}

/**
 * 创建 array 渲染器。调用方（JsonEditor）注入 deps，返回 render/addRow/removeRow。
 * 用法：
 *   const renderer = createArrayRenderer({ model, onChange, getComp, ... });
 *   // 在 renderInput 里：if (field.type === 'arrayitems') return renderer.render(field, fieldName);
 */
export function createArrayRenderer(deps: ArrayRendererDeps): ArrayRenderer {
  const { model, onChange, getComp, resolveComp, elementOptions, wrapChild } = deps;
  // renderInput 不解构：它与 renderer 互递归，调用方在 renderInput 定义后才回填
  // deps.renderInput，故每次 render 实时从 deps 取，避免捕获占位函数。

  const addRow = (fieldName: string): void => {
    const arr = ensureArray(model, fieldName);
    arr.push({});
    onChange();
  };

  const removeRow = (fieldName: string, index: number): void => {
    const arr = ensureArray(model, fieldName);
    arr.splice(index, 1);
    onChange();
  };

  const render = (field: FormField, fieldName: string): unknown[] => {
    const arr = ensureArray(model, fieldName);
    const addComp = getComp("arrayadd");
    const removeComp = getComp("arrayremove");
    const addLabel = (addComp?.option as ComponentOption)?.label ?? "Add";
    const removeLabel = (removeComp?.option as ComponentOption)?.label ?? "Remove";

    const rows = arr.map((_, i) => {
      // 深拷贝 itemsSchema 避免污染原 schema（loadFields 会 mutate property.name）
      const itemSchema = deepClone(field.itemsSchema as JsonSchema);
      const rowFields: Fields = {};
      // loadFields 用 sub 前缀：fieldName 按点拆分（支持嵌套 object 内的 array），
      // 追加 index 段，使行内字段 name 为 `fieldName.i.key`。
      loadFields({ value: model, fields: rowFields } as RecordAny, itemSchema, rowFields, [
        ...fieldName.split("."),
        String(i),
      ]);
      // 渲染该行每个字段（递归 renderInput，fieldName 已含 index 前缀）
      const cells: Child[] = [];
      for (const k of Object.keys(rowFields)) {
        if (k.indexOf("$") === 0) continue;
        const f = rowFields[k] as FormField;
        if (f && f.name) {
          const rendered = deps.renderInput(f, f.name) as unknown[];
          if (rendered[0] !== undefined) cells.push(rendered[0]);
        }
      }
      const removeBtnData = elementOptions(removeComp, {}, field, {});
      return h("div", { class: "json-editor-array-row" }, [
        h("div", { class: "json-editor-array-row-fields" }, cells),
        h(
          resolveComp(removeComp),
          {
            class: "json-editor-array-remove",
            onClick: () => removeRow(fieldName, i),
            ...removeBtnData,
          },
          wrapChild(removeComp, removeLabel),
        ),
      ]);
    });

    const addBtnData = elementOptions(addComp, {}, field, {});
    return [
      h("div", { class: "json-editor-array" }, [
        // header：标题（field.label）左 + 添加按钮右
        h("div", { class: "json-editor-array-header" }, [
          h("span", { class: "json-editor-array-title" }, field.label || ""),
          h(
            resolveComp(addComp),
            {
              class: "json-editor-array-add",
              onClick: () => addRow(fieldName),
              ...addBtnData,
            },
            wrapChild(addComp, addLabel),
          ),
        ]),
        ...rows,
      ]),
    ];
  };

  return { render, addRow, removeRow };
}
