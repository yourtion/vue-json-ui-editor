<script lang="ts">
import {
  type Component,
  computed,
  defineComponent,
  h,
  onMounted,
  reactive,
  ref,
  resolveComponent,
  watch,
} from "vue";
import { loadFields } from "./parser";
import type {
  ComponentConfig,
  ComponentOption,
  ComponentsMap,
  Fields,
  FormField,
  FormFieldItem,
  JsonSchema,
  OptionContext,
  VmContext,
} from "./types";
import { deepClone, getChild, initChild, setVal } from "./utils";

type RecordAny = Record<string, any>;

const nativeOption: ComponentOption = { native: true };
const components: Record<string, ComponentConfig> = {
  title: { component: "h1", option: nativeOption },
  description: { component: "p", option: nativeOption },
  error: { component: "div", option: nativeOption },
  form: { component: "form", option: nativeOption },
  file: { component: "input", option: nativeOption },
  label: { component: "label", option: nativeOption },
  input: { component: "input", option: nativeOption },
  radio: { component: "input", option: nativeOption },
  select: { component: "select", option: nativeOption },
  option: { component: "option", option: nativeOption },
  button: {
    component: "button",
    option: { ...nativeOption, type: "submit", label: "Submit" },
  },
  checkbox: { component: "input", option: nativeOption },
  textarea: { component: "textarea", option: nativeOption },
  radiogroup: { component: "div", option: nativeOption },
  checkboxgroup: { component: "div", option: nativeOption },
};
const defaultInput: ComponentConfig = { component: "input", option: nativeOption };
const defaultGroup: ComponentConfig = { component: "div", option: nativeOption };

// Known native HTML element tag names. When a registered component is a string
// that matches one of these, we pass it directly to h() as a native tag rather
// than trying resolveComponent() (which would emit a spurious "Failed to
// resolve component" warning for tags like h2/small that setComponent callers
// commonly use). Hoisted to module scope so the Set is built once, not rebuilt
// on every component instance.
const NATIVE_HTML_TAGS = new Set([
  "a",
  "abbr",
  "address",
  "area",
  "article",
  "aside",
  "audio",
  "b",
  "base",
  "bdi",
  "bdo",
  "blockquote",
  "body",
  "br",
  "button",
  "canvas",
  "caption",
  "cite",
  "code",
  "col",
  "colgroup",
  "data",
  "datalist",
  "dd",
  "del",
  "details",
  "dfn",
  "dialog",
  "div",
  "dl",
  "dt",
  "em",
  "embed",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "hgroup",
  "hr",
  "html",
  "i",
  "iframe",
  "img",
  "input",
  "ins",
  "kbd",
  "label",
  "legend",
  "li",
  "link",
  "main",
  "map",
  "mark",
  "menu",
  "meta",
  "meter",
  "nav",
  "noscript",
  "object",
  "ol",
  "optgroup",
  "option",
  "output",
  "p",
  "param",
  "picture",
  "pre",
  "progress",
  "q",
  "rp",
  "rt",
  "ruby",
  "s",
  "samp",
  "script",
  "section",
  "select",
  "slot",
  "small",
  "source",
  "span",
  "strong",
  "style",
  "sub",
  "summary",
  "sup",
  "table",
  "tbody",
  "td",
  "template",
  "textarea",
  "tfoot",
  "th",
  "thead",
  "time",
  "title",
  "tr",
  "track",
  "u",
  "ul",
  "var",
  "video",
  "wbr",
]);

/**
 * Edit JSON in UI form with JSON Schema and Vue.js `<json-editor>` component.
 *
 * Vue 3 port of the original Vue 2 Options API implementation. Preserves the
 * full public API: `setComponent(type, component, optionOrCallback)` (incl.
 * callback options that receive `{ vm, field, item }`), `vm.model/fields/error`
 * exposure, the two-pass render (createForm -> createNode), per-type branches
 * (text/textarea/radio/checkbox/select), label wrapping, and slots.
 *
 * @author Yourtion
 * @license MIT
 */
const JsonEditor = defineComponent({
  name: "JsonEditor",
  props: {
    /**
     * The JSON Schema object. Use the `v-if` directive to load asynchronous schema.
     */
    schema: { type: Object as () => JsonSchema, required: true },
    /**
     * v-model binding for the form data object.
     * @model
     * @default {}
     */
    modelValue: { type: Object as () => RecordAny, default: () => ({}) },
    /**
     * This property indicates whether the value of the control can be automatically completed by the browser. Possible values are: `off` and `on`.
     */
    autoComplete: { type: String, default: undefined },
    /**
     * This Boolean attribute indicates that the form is not to be validated when submitted.
     */
    noValidate: { type: Boolean, default: false },
    /**
     * Define the inputs wrapping class. Leave `undefined` to disable input wrapping.
     */
    inputWrappingClass: { type: String, default: undefined },
    /**
     * Per-instance component overrides. When provided, these are merged over the
     * global defaults (registered via `JsonEditor.setComponent`), so multiple
     * `<json-editor>` instances on the same page can each use a different UI lib
     * without polluting each other. Keys are element types
     * (e.g. `text`, `select`, `form`, `label`), values are `ComponentConfig`.
     * Leave `undefined` to fall back to the global registry (backwards compatible).
     */
    components: { type: Object as () => ComponentsMap, default: undefined },
  },
  emits: ["update:modelValue", "change", "submit", "invalid"],
  setup(props, { emit, slots, expose }) {
    // --- reactive state -------------------------------------------------
    // `model` is a reactive proxy over the incoming modelValue object, which
    // preserves the Vue 2 same-reference semantics: mutating `model` reflects
    // onto the parent's bound object directly. `defaultModel` is the snapshot
    // used by reset().
    const model = reactive(props.modelValue || {}) as RecordAny;
    const defaultModel = deepClone(props.modelValue || {}) as RecordAny;
    let fields: Fields = {};

    // --- per-instance components --------------------------------------
    // 传 components prop 时浅合并到全局默认（prop 覆盖）；不传则回退全局。
    // resolveComp/elementOptions 等所有 render 路径用此值，实现多实例隔离。
    // prop 值可简写为组件名/组件对象（与 setComponent 一致），这里归一化为 ComponentConfig。
    const normalizeComp = (
      v: ComponentConfig | string | Component | undefined,
    ): ComponentConfig | undefined => {
      if (v === undefined) return undefined;
      if (typeof v === "string" || (typeof v === "object" && v !== null && !("option" in v))) {
        return { component: v as string | Component, option: {} };
      }
      return v as ComponentConfig;
    };
    const resolvedComponents = computed<Record<string, ComponentConfig>>(() => {
      if (!props.components) return components;
      const merged: Record<string, ComponentConfig> = { ...components };
      for (const [k, v] of Object.entries(props.components)) {
        const norm = normalizeComp(v);
        if (norm) merged[k] = norm;
      }
      return merged;
    });
    const getComp = (key: string): ComponentConfig | undefined => resolvedComponents.value[key];
    const error = ref<string | null>(null);

    // `formRef` holds the rendered <form> component instance (or DOM node when
    // the default native <form> is used). Exposed via form() so callers can
    // reach the real element-plus el-form instance: jsonEditor.form().validate(cb).
    const formRef = ref<any>(null);
    // Per-input refs keyed by field name path, for the input() accessor.
    const inputRefs: Record<string, any> = {};

    // --- parser integration --------------------------------------------
    const reload = () => {
      fields = {};
      if (!props.schema) return;
      loadFields(model, deepClone(props.schema) as JsonSchema, fields);
    };
    reload();
    watch(
      () => props.schema,
      () => reload(),
      { deep: true },
    );

    // Sync incoming modelValue changes into our reactive model. Guard against
    // echoing our own emissions back (which would cause a watch loop).
    let emitting = false;
    watch(
      () => props.modelValue,
      (nv) => {
        if (emitting || nv === undefined || nv === null) return;
        if (nv === model) return;
        Object.keys(model).forEach((k) => delete model[k]);
        Object.assign(model, deepClone(nv));
        reload();
      },
      { deep: true },
    );

    // --- vm context exposed to option callbacks -------------------------
    const vm: VmContext = {
      // `model` is the same proxy the parent bound, so callbacks handing it
      // to el-form's `model` prop bind the live object.
      model,
      // getter keeps `fields` current across schema reloads
      get fields() {
        return fields;
      },
      get error() {
        return error.value;
      },
      set error(v: string | null) {
        error.value = v;
      },
    };

    // --- optionValue / elementOptions (ported from master methods) ------
    const optionValue = (field: FormField, target: unknown, item: RecordAny = {}): unknown => {
      return typeof target === "function"
        ? (target as (ctx: OptionContext) => RecordAny)({ vm, field, item })
        : target;
    };

    // Produces the h()-data object fragment for an element. In Vue 3 there is
    // no domProps/attrs split like Vue 2; everything flattens onto the data
    // object and Vue's fallthrough handles native attrs vs component props.
    const elementOptions = (
      element: ComponentConfig | undefined,
      extendingOptions: RecordAny = {},
      field: FormField = {} as FormField,
      item: RecordAny = {},
    ): RecordAny => {
      if (!element) return { ...extendingOptions };
      const elementProps =
        typeof element.option === "function"
          ? element.option
          : { ...element.option, native: undefined };
      const options = optionValue(field, elementProps, item) as RecordAny;
      return { ...extendingOptions, ...options };
    };

    // Whether an element is a native HTML tag (e.g. "input", "select") or a
    // registered component (e.g. ElInput, ElSelect). Mirrors master's logic:
    // `option.native` defaults to false when undefined — so a registered
    // component without an explicit option (e.g. setComponent('option', ElOption))
    // is treated as non-native and its children must go through the default slot.
    // Only the built-in `components` map sets native: true explicitly.
    const isNativeElement = (element: ComponentConfig | undefined): boolean => {
      if (!element || typeof element.option === "function") return false;
      return element.option.native === true;
    };

    // Whether an element is effectively native: either explicitly flagged
    // native in its option, or registered as a known HTML tag string.
    const isEffectivelyNative = (element: ComponentConfig | undefined): boolean => {
      if (!element || typeof element.option === "function") return false;
      if (element.option.native === true) return true;
      return typeof element.component === "string" && NATIVE_HTML_TAGS.has(element.component);
    };

    // Wrap a children VNode array for h(): native elements get the array
    // as-is; components receive children as a function (the form element-plus
    // and other Vue 3 UI libs expect for render-function usage — a slots
    // object does not always work because their internals resolve the default
    // slot via normalizedChildren which prefers a raw function child).
    const wrapChildren = (element: ComponentConfig | undefined, children: any[]): any => {
      if (children.length === 0) return undefined;
      if (isEffectivelyNative(element)) return children;
      return () => children;
    };

    // Wrap a single child (string/vnode) for h(): same native vs component
    // distinction as wrapChildren, but for a scalar child (e.g. option label).
    const wrapChild = (element: ComponentConfig | undefined, child: any): any => {
      if (child === undefined || child === null) return undefined;
      if (isEffectivelyNative(element)) return child;
      return () => child;
    };

    // NATIVE_HTML_TAGS is defined at module scope (above) so the Set is built
    // once instead of on every component instance.

    // Resolve an element's component for h(). In Vue 2, createElement('el-form')
    // implicitly resolved globally-registered components from a string id. In
    // Vue 3 this is a breaking change: h('el-form') treats the string as a
    // native HTML tag. To preserve the master API where setComponent is called
    // with string names like 'el-form' / 'el-input', we resolve non-native
    // string components via resolveComponent() at render time — unless the
    // string is a known native HTML tag (h2, small, ...), in which case it is
    // passed through directly.
    const resolveComp = (element: ComponentConfig | undefined): string | Component => {
      if (!element) return "div";
      const comp = element.component;
      if (typeof comp !== "string") return comp;
      if (isNativeElement(element)) return comp;
      if (NATIVE_HTML_TAGS.has(comp)) return comp;
      return resolveComponent(comp);
    };

    // --- helper used by input handlers ---------------------------------
    const writeField = (fieldName: string, value: unknown) => {
      const ns = fieldName.split(".");
      const ret = ns.length > 1 ? (initChild(model, ns.slice(0, -1)) as RecordAny) : model;
      const key = ns[ns.length - 1];
      ret[key] = value;
      emitting = true;
      emit("update:modelValue", model);
      emitting = false;
    };

    // --- object 数组增删行 ---------------------------------------------
    // 对 schema.items.type==='object' 的数组字段，渲染每行为子表单 + 删除按钮，
    // 列表底部「添加」按钮。每行字段通过 loadFields 递归 itemsSchema 渲染，
    // namespaced 到 `${fieldName}.${index}.`（getChild/setVal 已支持数组索引路径）。
    const ensureArray = (fieldName: string): unknown[] => {
      const cur = getChild(model, [fieldName]);
      if (Array.isArray(cur)) return cur;
      const arr: unknown[] = [];
      setVal(model, [fieldName], arr);
      return arr;
    };
    const addRow = (fieldName: string) => {
      const arr = ensureArray(fieldName);
      arr.push({});
      emitting = true;
      emit("update:modelValue", model);
      emitting = false;
    };
    const removeRow = (fieldName: string, index: number) => {
      const arr = ensureArray(fieldName);
      arr.splice(index, 1);
      emitting = true;
      emit("update:modelValue", model);
      emitting = false;
    };

    const renderArrayItems = (field: FormField, fieldName: string): any[] => {
      const arr = ensureArray(fieldName);
      const rows = arr.map((_, i) => {
        // 深拷贝 itemsSchema 避免污染原 schema（loadFields 会 mutate property.name）
        const itemSchema = deepClone(field.itemsSchema as JsonSchema);
        const rowFields: Fields = {};
        // loadFields 用 sub 前缀 [fieldName, i] → 字段 name 为 `fieldName.i.key`
        loadFields({ value: model, fields: rowFields } as any, itemSchema, rowFields, [
          fieldName,
          String(i),
        ]);
        // 渲染该行每个字段（递归 renderInput，fieldName 已含 index 前缀）
        const cells: any[] = [];
        for (const k of Object.keys(rowFields)) {
          if (k.indexOf("$") === 0) continue;
          const f = rowFields[k] as FormField;
          if (f && f.name) cells.push(renderInput(f, f.name)[0]);
        }
        return h("div", { class: "json-editor-array-row" }, [
          h("div", { class: "json-editor-array-row-fields" }, cells),
          h(
            "button",
            {
              type: "button",
              class: "json-editor-array-remove",
              onClick: () => removeRow(fieldName, i),
            },
            "删除",
          ),
        ]);
      });
      return [
        h("div", { class: "json-editor-array" }, [
          ...rows,
          h(
            "button",
            {
              type: "button",
              class: "json-editor-array-add",
              onClick: () => addRow(fieldName),
            },
            "添加",
          ),
        ]),
      ];
    };

    // --- render: per-field input vnode ---------------------------------
    const renderInput = (field: FormField, fieldName: string) => {
      // object 数组（items: {type:object}）：渲染可增删行的子表单列表
      if (field.type === "arrayitems" && field.itemsSchema) {
        return renderArrayItems(field, fieldName);
      }
      const fieldValue = getChild(model, fieldName.split("."));
      if (!field.value) {
        field.value = fieldValue;
      }

      const customComponent = field.component
        ? ({ component: field.component, option: {} } as ComponentConfig)
        : undefined;
      const element: ComponentConfig = field.component
        ? customComponent!
        : Object.prototype.hasOwnProperty.call(field, "items") && field.type !== "select"
          ? getComp(`${field.type}group`) || defaultGroup
          : getComp(field.type) || defaultInput;

      const children: any[] = [];
      const handleInput = (event: any) => {
        let value: unknown;
        if (event && event.target) {
          value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
        } else {
          value = event;
        }
        writeField(fieldName, value);
      };

      const baseInputData: RecordAny = {
        ref: (el: any) => {
          if (el) inputRefs[fieldName] = el;
        },
        onChange: (e: Event) => {
          emit("change", e);
        },
        ...elementOptions(element, {}, field, {}),
      };
      // disabled / readOnly 透传：parser 已解析到 field，这里传给渲染组件
      // （el-input 的 disabled、原生 input 的 disabled/readonly）。
      // 条件挂载，避免给原生元素传 undefined。
      if (field.disabled) baseInputData.disabled = true;
      if (field.readOnly) baseInputData.readonly = true;

      // Vue 2 element-ui bound via `value` + `input` event. Vue 3 element-plus
      // (and most v3 UI libs) bind via `modelValue` prop + `update:modelValue`
      // event. Native HTML <input>/<textarea>/<select> still use value/input.
      // Branch on isEffectivelyNative so both paths work.
      if (isEffectivelyNative(element)) {
        baseInputData.value = fieldValue;
        baseInputData.onInput = handleInput;
      } else {
        baseInputData.modelValue = fieldValue;
        baseInputData["onUpdate:modelValue"] = handleInput;
      }

      switch (field.type) {
        case "text":
          if (Object.prototype.hasOwnProperty.call(field, "placeholder")) {
            baseInputData.placeholder = field.placeholder;
          }
          break;
        case "textarea":
          if (isNativeElement(element)) {
            baseInputData.innerHTML = fieldValue;
          }
          break;
        case "radio":
        case "checkbox":
          if (Object.prototype.hasOwnProperty.call(field, "items")) {
            const items = field.items as FormFieldItem[];
            items.forEach((item: FormFieldItem) => {
              const itemRecord = item as unknown as RecordAny;
              const itemData = elementOptions(getComp(field.type), itemRecord, field, itemRecord);
              children.push(
                h(
                  resolveComp(getComp(field.type)),
                  itemData,
                  wrapChild(getComp(field.type), item.label),
                ),
              );
            });
          }
          break;
        case "select":
          if (!field.required) {
            children.push(h(resolveComp(getComp("option"))));
          }
          (field.items as FormFieldItem[]).forEach((opt: FormFieldItem) => {
            const optData = elementOptions(getComp("option"), { value: opt.value }, field, {});
            children.push(
              h(
                resolveComp(getComp("option")),
                { value: opt.value, ...optData },
                wrapChild(getComp("option"), opt.label),
              ),
            );
          });
          break;
        default:
          break;
      }

      const inputElement = h(resolveComp(element), baseInputData, wrapChildren(element, children));

      // --- label / description wrapping --------------------------------
      const formControlsNodes: any[] = [];
      const wrapLabel = field.label && !nativeOption.disableWrappingLabel;
      if (wrapLabel) {
        const labelComp = getComp("label");
        const labelData = elementOptions(labelComp, {}, field, {});
        const labelNodes: any[] = [];
        if (isNativeElement(labelComp)) {
          labelNodes.push(
            h("span", { "data-required-field": field.required ? "true" : "false" }, field.label),
          );
        }
        labelNodes.push(inputElement);
        if (field.description) {
          labelNodes.push(h("br"));
          labelNodes.push(h("small", field.description));
        }
        formControlsNodes.push(
          h(resolveComp(labelComp), labelData, wrapChildren(labelComp, labelNodes)),
        );
      } else {
        formControlsNodes.push(inputElement);
        if (field.description) {
          formControlsNodes.push(h("br"));
          formControlsNodes.push(h("small", field.description));
        }
      }
      // inputWrappingClass: wrap all controls for this field in a <div class=...>.
      // Matches master's behavior (master pushes into formNodes either wrapped
      // or flat). When wrapping, the wrapped div becomes the single stashed node.
      if (props.inputWrappingClass) {
        return [h("div", { class: props.inputWrappingClass }, formControlsNodes)];
      }
      return formControlsNodes;
    };

    // --- render: two-pass traversal (createForm -> createNode) ---------
    // Pass 1: render each field into a vnode and stash it, keyed by the full
    // dotted namespace path, into `stash`. Recurse through `$sub` containers.
    // Pass 2: walk the same field tree in DOM order, pulling vnodes out of
    // `stash` and wrapping nested objects with sub-title/sub containers.
    // (master uses a nested formNode + setVal/getChild; we flatten to a dotted
    // key map which is easier to reason about and avoids path-consumption bugs.)
    const renderFormTree = () => {
      const stash: Record<string, any> = {};

      const createForm = (fieldsObj: Fields, prefix: string) => {
        Object.keys(fieldsObj).forEach((key) => {
          if (key.indexOf("$") === 0) return;
          const field = fieldsObj[key] as FormField;
          if (field && field.$sub) {
            createForm(field as unknown as Fields, prefix ? `${prefix}.${key}` : key);
            return;
          }
          if (!field || !field.name) return;
          const controls = renderInput(field, field.name);
          stash[field.name] = controls[0];
        });
      };
      createForm(fields, "");

      const createNode = (fieldsObj: Fields): any[] => {
        const nodes: any[] = [];
        if ((fieldsObj as RecordAny).$title) {
          nodes.push(h("div", { class: "sub-title" }, (fieldsObj as RecordAny).$title));
        }
        if ((fieldsObj as RecordAny).$description) {
          nodes.push(h("div", { class: "sub-description" }, (fieldsObj as RecordAny).$description));
        }
        Object.keys(fieldsObj).forEach((key) => {
          if (key.indexOf("$") === 0) return;
          const field = fieldsObj[key] as FormField;
          if (field && field.$sub) {
            const child = createNode(field as unknown as Fields);
            nodes.push(h("div", { class: "sub" }, child));
          } else if (field && field.name && stash[field.name]) {
            nodes.push(stash[field.name]);
          }
        });
        return nodes;
      };

      return createNode(fields);
    };

    // --- top-level render function -------------------------------------
    const render = () => {
      // Schema guard (master parity)
      if (!props.schema) {
        console.warn("JsonEditor: schema is required but was not provided");
        return h("div", "Invalid schema: schema is required");
      }

      const nodes: any[] = [];
      if (props.schema.title) {
        const titleComp = getComp("title");
        const titleData = elementOptions(titleComp, {});
        nodes.push(h(resolveComp(titleComp), titleData, props.schema.title));
      }
      if (props.schema.description) {
        const descComp = getComp("description");
        const descData = elementOptions(descComp, {});
        nodes.push(h(resolveComp(descComp), descData, props.schema.description));
      }
      if (error.value) {
        const errorComp = getComp("error");
        const errorData = elementOptions(errorComp, {});
        // When error is a native element (default <div>), the error text goes
        // into children; when it's a registered component (e.g. ElAlert), the
        // text is conveyed via a callback option prop (e.g. title: vm.error).
        const isErrorNative = isNativeElement(errorComp);
        const errorChildren: any[] = isErrorNative ? [error.value] : [];
        nodes.push(h(resolveComp(errorComp), errorData, isErrorNative ? errorChildren : undefined));
      }

      const allFormNodes: any[] = [];
      allFormNodes.push(renderFormTree());

      // --- submit button / slot --------------------------------------
      const labelComp = getComp("label");
      const labelData = elementOptions(labelComp, {});
      const slotVnodes = slots.default ? slots.default() : null;
      if (slotVnodes && slotVnodes.length) {
        allFormNodes.push(
          h(resolveComp(labelComp), labelData, wrapChildren(labelComp, slotVnodes)),
        );
      } else {
        const buttonComp = getComp("button");
        const buttonData = elementOptions(buttonComp, {});
        const buttonElement = h(
          resolveComp(buttonComp),
          buttonData,
          (buttonComp?.option as ComponentOption).label,
        );
        allFormNodes.push(
          h(resolveComp(labelComp), labelData, wrapChildren(labelComp, [buttonElement])),
        );
      }

      const formComp = getComp("form");
      const formData = elementOptions(formComp, {
        autocomplete: props.autoComplete,
        novalidate: props.noValidate,
      });
      nodes.push(
        h(
          resolveComp(formComp),
          {
            ref: formRef,
            onSubmit: (event: Event) => {
              event.stopPropagation();
              if (checkValidity()) {
                emit("submit", event);
              }
            },
            onInvalid: (e: Event) => {
              emit("invalid", e);
            },
            ...formData,
          },
          wrapChildren(formComp, allFormNodes),
        ),
      );
      return h("div", nodes);
    };

    // --- exposed methods (master parity) -------------------------------
    const input = (name: string): HTMLElement => {
      if (!inputRefs[name]) {
        throw new Error(`Undefined input reference '${name}'`);
      }
      return inputRefs[name];
    };
    const form = () => formRef.value;
    const checkValidity = (): boolean => {
      const el = formRef.value;
      if (el && typeof el.checkValidity === "function") {
        return el.checkValidity();
      }
      return true;
    };
    // Establish the data baseline from `defaultModel` (the snapshot of the
    // initial modelValue). Shared by reset() and the onMounted bootstrap.
    const applyDefault = () => {
      Object.keys(model).forEach((k) => delete model[k]);
      Object.assign(model, deepClone(defaultModel));
      reload();
    };
    const reset = () => {
      applyDefault();
      emitting = true;
      emit("update:modelValue", model);
      emitting = false;
    };
    const validate = async () => {
      const el = formRef.value;
      if (el && typeof el.validate === "function") {
        return el.validate();
      }
      return { valid: checkValidity(), errors: [] as unknown[] };
    };
    const setErrorMessage = (message: string) => {
      error.value = message;
    };
    const clearErrorMessage = () => {
      error.value = null;
    };
    const getFields = () => fields;

    // Bootstrap the initial data baseline. We deliberately do NOT emit
    // update:modelValue here: this data originated from the parent's
    // modelValue, so echoing it back on mount is redundant and can surprise
    // v-model consumers that transform or watch the bound value. reset() still
    // emits when called explicitly by the consumer.
    onMounted(() => {
      applyDefault();
    });

    expose({
      reset,
      form,
      input,
      checkValidity,
      validate,
      setErrorMessage,
      clearErrorMessage,
      getFields,
      // expose vm so option callbacks and advanced consumers can reach it
      get vm() {
        return vm;
      },
    });

    return render;
  },
});

export default JsonEditor;

// Static API: register a component for a field/element type. Mirrors master's
// setComponent(type, component, option?). `option` may be a plain object or a
// factory callback ({ vm, field, item }) => propsObject.
// Usage: JsonEditor.setComponent('email', ElInput)
//        JsonEditor.setComponent('form', ElForm, ({ vm }) => ({ ... }))
interface JsonEditorStatic {
  setComponent: (type: string, component: string | Component, option?: ComponentOption) => void;
}
(JsonEditor as unknown as JsonEditorStatic).setComponent = (type, component, option = {}) => {
  components[type] = { component, option };
};
</script>
