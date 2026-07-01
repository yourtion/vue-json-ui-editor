// src/parser.ts
import type { FormField, FormFieldItem, JsonSchema, JsonSchemaProperty } from "./types";
import type { RecordAny } from "./utils";
import { getChild, setVal } from "./utils";

const ARRAY_KEYWORDS = ["anyOf", "oneOf", "enum"] as const;

function setCommonFields(schema: JsonSchemaProperty, field: FormField, schemaName: string) {
  field.value = Object.prototype.hasOwnProperty.call(schema, "default")
    ? schema.default
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
  field.required = schema.required || false;
  // readOnly: JSON Schema 标准的只读标记。readOnly 同时隐含 disabled（只读字段不应可编辑）。
  field.readOnly = schema.readOnly || false;
  field.disabled = schema.disabled || schema.readOnly || false;
  field.name = schemaName;
}

function setFormValue(model: RecordAny, field: FormField) {
  const ns = field.name.split(".");
  const vmValue = getChild(model, ns);
  if (model && vmValue === undefined) {
    // ensure parent exists and set value
    setVal(model, ns, field.value);
  }
}

export const parseBoolean = (
  model: RecordAny,
  schema: JsonSchemaProperty,
  schemaName: string,
): FormField => {
  const field: FormField = (schema.attrs || {}) as FormField;
  setCommonFields(schema, field, schemaName);
  if (!field.type) field.type = "checkbox";
  field.checked = schema.checked || false;
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
  const field: FormField = (schema.attrs || {}) as FormField;
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
  if (schema.minLength) field.minlength = schema.minLength;
  if (schema.maxLength) field.maxlength = schema.maxLength;
  return field;
};

export const parseItems = (items: unknown[]): FormFieldItem[] => {
  return items.map((item) => {
    if (typeof item !== "object" || item === null) {
      return { value: item, label: String(item) };
    }
    return item as FormFieldItem;
  });
};

export const parseArray = (
  model: RecordAny,
  schema: JsonSchemaProperty,
  schemaName: string,
): FormField => {
  const field: FormField = (schema.attrs || {}) as FormField;
  setCommonFields(schema, field, schemaName);
  field.multiple = (schema.minItems || 0) > 1;
  field.items = [];
  for (const keyword of ARRAY_KEYWORDS) {
    if (Object.prototype.hasOwnProperty.call(schema, keyword)) {
      switch (keyword) {
        case "enum":
          if (!field.type) field.type = "select";
          field.value = field.value || "";
          field.items = parseItems(schema[keyword as keyof JsonSchemaProperty] as unknown[]);
          break;
        case "oneOf":
          field.type = "radio";
          field.value = field.value || "";
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

// Overloaded function signatures.
// loadFields is polymorphic: callers pass either a root-level JsonSchema
// (`required: string[]`) or a field-level JsonSchemaProperty (`required:
// boolean`), whose `required` shapes are incompatible by design — hence the
// union. The implementation signature stays loosely typed so it can recurse
// through both without forcing `as` at every internal call site.
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

  if (vmOrModel && typeof vmOrModel === "object" && "value" in vmOrModel && "fields" in vmOrModel) {
    // Old signature: loadFields(vm, schema)
    model = vmOrModel.value;
    fieldsObj = vmOrModel.fields;
  } else {
    // New signature: loadFields(model, schema, fields)
    model = vmOrModel;
    fieldsObj = fields!;
  }
  if (!schema || schema.visible === false) return;

  // For root schema, process properties
  if (schema.type === "object" && schema.properties && !sub) {
    // Handle required fields at root level
    if (schema.required && Array.isArray(schema.required)) {
      for (const field of schema.required) {
        if (schema.properties[field]) schema.properties[field].required = true;
      }
    }
    for (const key in schema.properties) {
      schema.properties[key].name = key;
      loadFields(model, schema.properties[key], fieldsObj, [key]);
    }
    return;
  }

  const schemaName = sub ? sub.join(".") : schema.name || "";

  switch (schema.type) {
    case "object":
      if (schema.properties) {
        for (const key in schema.properties) {
          schema.properties[key].name = key;
          if (schema.required && Array.isArray(schema.required)) {
            for (const field of schema.required) {
              if (schema.properties[field]) schema.properties[field].required = true;
            }
          }
          if (schema.name && !fieldsObj[schemaName]) {
            fieldsObj[schemaName] = {
              $sub: true,
              $title: schema.title,
              $description: schema.description,
            };
          }
          loadFields(
            model,
            schema.properties[key],
            schema.name ? (fieldsObj[schemaName] as RecordAny) : fieldsObj,
            sub ? [...sub, key] : [key],
          );
        }
      }
      break;
    case "boolean":
      if (schemaName) fieldsObj[schemaName] = parseBoolean(model, schema, schemaName);
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
