// JSON Schema related types
import type { Component } from "vue";
import type { RecordAny } from "../utils.js";

/** 组件注册选项：纯对象 props 或工厂回调（接收 {vm, field, item}） */
export interface ComponentOption {
  native?: boolean;
  type?: string;
  label?: string;
  disableWrappingLabel?: boolean;
  [key: string]: unknown;
}

/** 单个类型→组件的配置 */
export interface ComponentConfig {
  component: string | Component;
  option: ComponentOption | ((ctx: OptionContext) => RecordAny);
}

/** 类型→组件的注册表（per-instance components prop 或全局默认） */
export type ComponentsMap = Record<string, ComponentConfig>;

/** setComponent / option 回调的上下文：当前 vm（model/fields/error）、字段、候选项 */
export interface OptionContext {
  vm: VmContext;
  field: FormField;
  item: Record<string, unknown>;
}

/** vm 上下文：暴露给 option 回调的响应式 model/fields/error */
export interface VmContext {
  model: RecordAny;
  fields: Fields;
  error: string | null;
}

export interface JsonSchemaProperty {
  // `type` is optional: many valid schemas omit it (fields described only by
  // `format`, `enum`, etc.). Kept as a broad string to match real-world usage
  // and to avoid narrowing issues with object-literal schemas in tests.
  type?: string;
  title?: string;
  description?: string;
  default?: unknown;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  visible?: boolean;
  name?: string;
  component?: string;
  // `format` accepts any string: JSON Schema defines many formats beyond the
  // three originally enumerated (email/uri/regex) — date, time, color, etc.
  format?: string;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  minimum?: number;
  maximum?: number;
  enum?: unknown[];
  oneOf?: unknown[];
  anyOf?: unknown[];
  items?: JsonSchemaProperty;
  properties?: Record<string, JsonSchemaProperty>;
  attrs?: Record<string, unknown>;
  checked?: boolean;
}

export interface JsonSchema extends Omit<JsonSchemaProperty, "required"> {
  $schema?: string;
  $id?: string;
  // At object level, `required` is a list of property names (JSON Schema
  // standard). This overrides the field-level `required?: boolean` from
  // JsonSchemaProperty, which expresses whether a single field is required.
  required?: string[];
}

// Field types for form rendering
export interface FormField {
  type: string;
  value: unknown;
  component?: string;
  schemaType: string;
  label: string;
  description: string;
  required: boolean;
  disabled: boolean;
  readOnly: boolean;
  name: string;
  checked?: boolean;
  multiple?: boolean;
  items?: FormFieldItem[];
  minlength?: number;
  maxlength?: number;
  pattern?: string;
  [key: string]: unknown;
}

export interface FormFieldItem {
  value: unknown;
  label: string;
}

// Sub-field structure for nested objects
export interface SubField {
  $sub: boolean;
  $title?: string;
  $description?: string;
  [key: string]: unknown;
}

// Fields collection type
export type Fields = Record<string, FormField | SubField>;

// Vue component instance type for parser functions.
// Vue 3 uses Proxy-based reactivity, so the Vue 2 `$set` helper is no longer
// needed — direct property assignment is reactive on reactive() objects.
export interface VueInstance {
  value: Record<string, unknown>;
  fields: Fields;
}

// Utility function types
export type DeepCloneFunction = <T>(obj: T) => T;
export type GetChildFunction = (data: Record<string, unknown>, ns: string[]) => unknown;
export type InitChildFunction = (
  data: Record<string, unknown>,
  ns: string[],
) => Record<string, unknown>;
export type SetValFunction = (
  data: Record<string, unknown>,
  n: string | string[],
  v: unknown,
) => unknown;

// Parser function types
export type ParseBooleanFunction = (
  vm: VueInstance,
  schema: JsonSchemaProperty,
  schemaName: string,
) => FormField;
export type ParseStringFunction = (
  vm: VueInstance,
  schema: JsonSchemaProperty,
  schemaName: string,
) => FormField;
export type ParseArrayFunction = (
  vm: VueInstance,
  schema: JsonSchemaProperty,
  schemaName: string,
) => FormField;
export type ParseItemsFunction = (items: unknown[]) => FormFieldItem[];
export type LoadFieldsFunction = (
  vm: VueInstance,
  schema: JsonSchemaProperty,
  fields?: Fields,
  sub?: string[],
) => void;
