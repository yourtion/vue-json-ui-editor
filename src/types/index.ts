// JSON Schema related types
export interface JsonSchemaProperty {
  type: "string" | "number" | "integer" | "boolean" | "array" | "object";
  title?: string;
  description?: string;
  default?: unknown;
  required?: boolean;
  disabled?: boolean;
  visible?: boolean;
  name?: string;
  component?: string;
  format?: "email" | "uri" | "regex";
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

export interface JsonSchema extends JsonSchemaProperty {
  $schema?: string;
  $id?: string;
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

// Vue component instance type for parser functions
export interface VueInstance {
  value: Record<string, unknown>;
  fields: Fields;
  $set: (target: Record<string, unknown>, key: string, value: unknown) => void;
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
