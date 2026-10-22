// src/parser.ts
import type { FormField, FormFieldItem, JsonSchema, JsonSchemaProperty } from "./types";
import type { RecordAny } from "./utils";
import { deepClone, getChild, setVal } from "./utils";

const ARRAY_KEYWORDS = ["anyOf", "oneOf", "enum"] as const;

function setCommonFields(schema: JsonSchemaProperty, field: FormField, schemaName: string) {
  field.value = Object.prototype.hasOwnProperty.call(schema, "default")
    ? deepClone(schema.default)
    : Object.prototype.hasOwnProperty.call(field, "value")
      ? field.value
      : "";
  field.component = schema.component;
  field.schemaType = schema.type ?? "";
  field.label = schema.title || "";
  // Subscription.vue and other consumers read `field.title` (e.g. for el-form
  // rule messages). master only set `label`; we mirror it to `title` so both
  // keys work without forcing consumers to change.
  field.title = schema.title || "";
  field.description = schema.description || "";
  field.required = schema.required === true;
  // readOnly: JSON Schema 标准的只读标记。readOnly 同时隐含 disabled（只读字段不应可编辑）。
  field.readOnly = schema.readOnly || false;
  field.disabled = schema.disabled || schema.readOnly || false;
  field.name = schemaName;
  field.inputAttrs = deepClone(schema.attrs || {});
}

function setFormValue(model: RecordAny, field: FormField) {
  const ns = field.name.split(".");
  const vmValue = getChild(model, ns);
  if (model && vmValue === undefined) {
    // ensure parent exists and set value
    setVal(model, ns, deepClone(field.value));
  }
}

export const parseBoolean = (
  model: RecordAny,
  schema: JsonSchemaProperty,
  schemaName: string,
): FormField => {
  const field = deepClone(schema.attrs || {}) as FormField;
  setCommonFields(schema, field, schemaName);
  if (!field.type) field.type = "checkbox";
  field.checked = schema.checked || false;
  if (schema.default === undefined && field.value === "") field.value = field.checked;
  if (schema.name) {
    field.name = schemaName;
    setFormValue(model, field);
  }
  return field;
};

export const parseString = (
  model: RecordAny,
  schema: JsonSchemaProperty,
  schemaName: string,
): FormField => {
  const field = deepClone(schema.attrs || {}) as FormField;
  if (schema.format) {
    switch (schema.format) {
      case "email":
        if (!field.type) field.type = "email";
        break;
      case "uri":
        if (!field.type) field.type = "url";
        break;
      case "regex":
        if (!field.type) field.type = "text";
        field.pattern = schema.pattern;
        break;
    }
  }
  if (!field.type) {
    switch (schema.type) {
      case "number":
      case "integer":
        field.type = "number";
        break;
      default:
        field.type = "text";
    }
  }
  setCommonFields(schema, field, schemaName);
  if (schema.name) {
    field.name = schemaName;
    setFormValue(model, field);
  }
  if (schema.minLength !== undefined) field.minlength = schema.minLength;
  if (schema.maxLength !== undefined) field.maxlength = schema.maxLength;
  if (schema.pattern !== undefined) field.pattern = schema.pattern;
  if (schema.minimum !== undefined) field.min = schema.minimum;
  if (schema.maximum !== undefined) field.max = schema.maximum;
  if (schema.type === "integer") field.step = 1;
  else if (schema.type === "number" && field.step === undefined) field.step = "any";
  return field;
};

export const parseItems = (items: unknown[]): FormFieldItem[] => {
  return items.map((item) => {
    if (typeof item !== "object" || item === null) {
      return { value: item, label: String(item) };
    }
    return deepClone(item) as FormFieldItem;
  });
};

export const parseArray = (
  model: RecordAny,
  schema: JsonSchemaProperty,
  schemaName: string,
): FormField => {
  const field = deepClone(schema.attrs || {}) as FormField;
  setCommonFields(schema, field, schemaName);
  field.multiple = (schema.minItems || 0) > 1;
  field.items = [];

  // 优先：object 数组（items: {type:object, properties}）→ 可增删行的子表单列表
  if (schema.items?.type === "object" && schema.items.properties) {
    field.type = "arrayitems";
    field.itemsSchema = deepClone(schema.items);
    const cur = model ? getChild(model, schemaName.split(".")) : undefined;
    field.value = deepClone(
      Array.isArray(cur) ? cur : Array.isArray(field.value) ? field.value : [],
    );
    field.minItems = schema.minItems;
    field.maxItems = schema.maxItems;
    if (schema.name) {
      field.name = schemaName;
      setFormValue(model, field);
    }
    return field;
  }

  for (const keyword of ARRAY_KEYWORDS) {
    if (Object.prototype.hasOwnProperty.call(schema, keyword)) {
      switch (keyword) {
        case "enum":
          if (!field.type) field.type = "select";
          field.value = field.value ?? "";
          field.items = parseItems(schema[keyword as keyof JsonSchemaProperty] as unknown[]);
          break;
        case "oneOf":
          field.type = "radio";
          field.value = field.value ?? "";
          field.items = parseItems(schema[keyword as keyof JsonSchemaProperty] as unknown[]);
          break;
        case "anyOf":
          field.type = "checkbox";
          field.value = field.value || [];
          field.items = parseItems(schema[keyword as keyof JsonSchemaProperty] as unknown[]);
          break;
      }
    }
  }
  if (!field.type) {
    field.type = schema.type ?? "";
    field.value = field.value || [];
    field.items = [];
  }
  if (schema.name) {
    field.name = schemaName;
    setFormValue(model, field);
  }
  return field;
};

// Both signatures initialize the target model/field tree in place while
// treating schema as read-only. Use parseSchema for an isolated model too.
export function loadFields(
  vm: { value: RecordAny; fields: RecordAny },
  schema: JsonSchema | JsonSchemaProperty,
): void;
export function loadFields(
  model: RecordAny,
  schema: JsonSchema | JsonSchemaProperty,
  fields: RecordAny,
  sub?: string[],
): void;
export function loadFields(vmOrModel: any, schema: any, fields?: RecordAny, sub?: string[]): void {
  let model: RecordAny;
  let fieldsObj: RecordAny;

  if (
    fields === undefined &&
    vmOrModel &&
    typeof vmOrModel === "object" &&
    "value" in vmOrModel &&
    "fields" in vmOrModel
  ) {
    // Old signature: loadFields(vm, schema)
    model = vmOrModel.value;
    fieldsObj = vmOrModel.fields;
  } else {
    // New signature: loadFields(model, schema, fields)
    model = vmOrModel;
    fieldsObj = fields!;
  }
  if (!schema || schema.visible === false) return;

  const schemaName = sub ? sub.join(".") : schema.name || "";

  switch (schema.type) {
    case "object":
      if (schema.properties) {
        const nested = sub && schema.name;
        if (nested) {
          fieldsObj[schemaName] = {
            $sub: true,
            $title: schema.title,
            $description: schema.description,
          };
        }
        for (const [key, property] of Object.entries(schema.properties)) {
          const child = property as JsonSchemaProperty;
          // Derive UI metadata on a fresh object. A nested object's required
          // list belongs to its children and must never be replaced by true.
          const childSchema = {
            ...child,
            name: key,
            disabled: schema.disabled || child.disabled,
            readOnly: schema.readOnly || child.readOnly,
            required: Array.isArray(child.required)
              ? child.required
              : (Array.isArray(schema.required) && schema.required.includes(key)) || child.required,
          };
          loadFields(
            model,
            childSchema,
            nested ? (fieldsObj[schemaName] as RecordAny) : fieldsObj,
            sub ? [...sub, key] : [key],
          );
        }
      }
      break;
    case "boolean":
      if (schemaName)
        fieldsObj[schemaName] = schema.enum
          ? parseArray(model, schema, schemaName)
          : parseBoolean(model, schema, schemaName);
      break;
    case "array":
      if (schemaName) fieldsObj[schemaName] = parseArray(model, schema, schemaName);
      break;
    case "integer":
    case "number":
    case "string":
      for (const keyword of ARRAY_KEYWORDS) {
        if (Object.prototype.hasOwnProperty.call(schema, keyword)) {
          const arraySchema: JsonSchemaProperty = {
            ...schema,
            items: {
              type: schema.type,
              enum: schema[keyword as keyof JsonSchemaProperty] as unknown[],
            },
          };
          if (schemaName) fieldsObj[schemaName] = parseArray(model, arraySchema, schemaName);
          return;
        }
      }
      if (schemaName) fieldsObj[schemaName] = parseString(model, schema, schemaName);
      break;
    default:
      if (schemaName) fieldsObj[schemaName] = parseString(model, schema, schemaName);
  }
}

/** Parse without changing either input; low-level loadFields initializes its model in place. */
export function parseSchema(schema: JsonSchema, value: RecordAny = {}) {
  const model = deepClone(value);
  const fields: RecordAny = {};
  loadFields(model, schema, fields);
  return { model, fields };
}
