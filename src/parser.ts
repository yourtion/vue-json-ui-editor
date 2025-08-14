import { initChild, getChild } from "./utils";
import type {
  JsonSchemaProperty,
  FormField,
  FormFieldItem,
  VueInstance,
  ParseBooleanFunction,
  ParseStringFunction,
  ParseArrayFunction,
  ParseItemsFunction,
  LoadFieldsFunction,
  Fields,
} from "./types";

const ARRAY_KEYWORDS: readonly string[] = ["anyOf", "oneOf", "enum"] as const;

function setCommonFields(schema: JsonSchemaProperty, field: FormField, schemaName: string): void {
  // eslint-disable-next-line no-nested-ternary
  field.value = Object.hasOwn(schema, "default")
    ? schema.default
    : Object.hasOwn(field, "value")
      ? field.value
      : "";

  field.component = schema.component;
  field.schemaType = schema.type;
  field.label = schema.title || "";
  field.description = schema.description || "";
  field.required = schema.required || false;
  field.disabled = schema.disabled || false;
  field.name = schemaName;
}

function setFormValue(vm: VueInstance, field: FormField): void {
  const ns: string[] = field.name.split(".");
  const vmValue: unknown = getChild(vm.value, ns);
  if (vm.value && !vmValue) {
    const n: string = ns.pop() as string;
    const ret: Record<string, unknown> = ns.length > 0 ? initChild(vm.value, ns) : vm.value;
    vm.$set(ret, n, field.value);
  }
}

export const parseBoolean: ParseBooleanFunction = (
  vm: VueInstance,
  schema: JsonSchemaProperty,
  schemaName: string,
): FormField => {
  const field: FormField = (schema.attrs || {}) as FormField;

  setCommonFields(schema, field, schemaName);

  if (!field.type) {
    field.type = "checkbox";
  }

  field.checked = schema.checked || false;

  if (schema.name) {
    field.name = schemaName;

    setFormValue(vm, field);
  }

  return field;
};

export const parseString: ParseStringFunction = (
  vm: VueInstance,
  schema: JsonSchemaProperty,
  schemaName: string,
): FormField => {
  const field: FormField = (schema.attrs || {}) as FormField;

  if (schema.format) {
    switch (schema.format) {
      case "email":
        if (!field.type) {
          field.type = "email";
        }
        break;
      case "uri":
        if (!field.type) {
          field.type = "url";
        }
        break;
      case "regex":
        if (!field.type) {
          field.type = "text";
        }

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

    setFormValue(vm, field);
  }

  if (schema.minLength) {
    field.minlength = schema.minLength;
  }

  if (schema.maxLength) {
    field.maxlength = schema.maxLength;
  }

  return field;
};

export const parseItems: ParseItemsFunction = (items: unknown[]): FormFieldItem[] => {
  return items.map((item: unknown): FormFieldItem => {
    if (typeof item !== "object" || item === null) {
      return { value: item, label: String(item) };
    }

    return item as FormFieldItem;
  });
};

export const parseArray: ParseArrayFunction = (
  vm: VueInstance,
  schema: JsonSchemaProperty,
  schemaName: string,
): FormField => {
  const field: FormField = (schema.attrs || {}) as FormField;

  setCommonFields(schema, field, schemaName);

  field.multiple = (schema.minItems || 0) > 1;
  field.items = [];

  for (const keyword of ARRAY_KEYWORDS) {
    if (Object.hasOwn(schema, keyword)) {
      switch (keyword) {
        case "enum":
          if (!field.type) {
            field.type = "select";
          }
          field.value = field.value || "";
          field.items = parseItems(schema[keyword] as unknown[]);
          break;

        case "oneOf":
          field.type = "radio";
          field.value = field.value || "";
          field.items = parseItems(schema[keyword] as unknown[]);
          break;

        case "anyOf":
          field.type = "checkbox";
          field.value = field.value || [];
          field.items = parseItems(schema[keyword] as unknown[]);
          break;
      }
    }
  }
  if (!field.type) {
    field.type = schema.type;
    field.value = field.value || [];
    field.items = [];
  }

  if (schema.name) {
    field.name = schemaName;

    setFormValue(vm, field);
  }

  return field;
};

export const loadFields: LoadFieldsFunction = (
  vm: VueInstance,
  schema: JsonSchemaProperty,
  fields: Fields = vm.fields,
  sub?: string[],
): void => {
  if (!schema || schema.visible === false) return;

  const schemaName: string = sub ? sub.join(".") : schema.name || "";

  switch (schema.type) {
    case "object":
      if (schema.properties) {
        for (const key in schema.properties) {
          schema.properties[key].name = key;

          if (schema.required && Array.isArray(schema.required)) {
            for (const field of schema.required) {
              if (schema.properties[field]) {
                schema.properties[field].required = true;
              }
            }
          }
          if (schema.name && !fields[schemaName]) {
            fields[schemaName] = {
              $sub: true,
              $title: schema.title,
              $description: schema.description,
            };
          }
          loadFields(
            vm,
            schema.properties[key],
            schema.name ? (fields[schemaName] as Fields) : undefined,
            sub ? [...sub, key] : [key],
          );
        }
      }
      break;

    case "boolean":
      fields[schemaName] = parseBoolean(vm, schema, schemaName);
      break;

    case "array":
      fields[schemaName] = parseArray(vm, schema, schemaName);
      break;

    case "integer":
    case "number":
    case "string":
      for (const keyword of ARRAY_KEYWORDS) {
        if (Object.hasOwn(schema, keyword)) {
          const arraySchema: JsonSchemaProperty = {
            ...schema,
            items: {
              type: schema.type,
              enum: schema[keyword as keyof JsonSchemaProperty] as unknown[],
            },
          };
          fields[schemaName] = parseArray(vm, arraySchema, schemaName);
          return;
        }
      }
      fields[schemaName] = parseString(vm, schema, schemaName);
      break;
    default:
      fields[schemaName] = parseString(vm, schema, schemaName);
  }
};
