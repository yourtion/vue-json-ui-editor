'use strict';

const ARRAY_KEYWORDS = [ 'anyOf', 'oneOf', 'enum' ];

const setCommonFields = (schema, field) => {
  // eslint-disable-next-line no-nested-ternary
  field.value = schema.hasOwnProperty('default')
    ? schema.default
    : field.hasOwnProperty('value') ? field.value : '';

  field.schemaType = schema.type;
  field.label = schema.title || '';
  field.description = schema.description || '';
  field.required = schema.required || false;
  field.disabled = schema.disabled || false;
};

const setFormValue = (vm, field) => {
  if (vm.value && !vm.value[field.name]) {
    vm.$set(vm.value, field.name, field.value);
  }
};


export const parseBoolean = (vm, schema) => {
  const field = schema.attrs || {};

  setCommonFields(schema, field);

  if (!field.type) {
    field.type = 'checkbox';
  }

  field.checked = schema.checked || false;
  
  if (schema.name) {
    field.name = schema.name;

    setFormValue(vm, field);
  }

  return field;
};

export const parseString = (vm, schema) => {
  const field = schema.attrs || {};

  if (!field.type) {
    switch (schema.type) {
    case 'number':
    case 'integer':
      field.type = 'number';
      break;
    default:
      field.type = 'text';
    }
  }

  if (schema.format) {
    switch (schema.format) {
    case 'email':
      if (!field.type) {
        field.type = 'email';
      }
      break;
    case 'uri':
      if (!field.type) {
        field.type = 'url';
      }
      break;
    case 'regex':
      if (!field.type) {
        field.type = 'text';
      }

      field.pattern = schema.format;
      break;
    }
  }

  setCommonFields(schema, field);

  if (schema.name) {
    field.name = schema.name;

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

export const parseItems = (items) => {
  return items.map((item) => {
    if (typeof item !== 'object') {
      return { value: item, label: item };
    }

    return item;
  });
};

export const parseArray = (vm, schema) => {
  const field = schema.attrs || {};

  setCommonFields(schema, field);

  field.multiple = schema.minItems > 1;
  field.items = [];

  for (const keyword of ARRAY_KEYWORDS) {
    if (schema.hasOwnProperty(keyword)) {
      switch (keyword) {
      case 'enum':
        if (!field.type) {
          field.type = 'select';
        }
        field.value = field.value || '';
        field.items = parseItems(schema[keyword]);
        break;

      case 'oneOf':
        field.type = 'radio';
        field.value = field.value || '';
        field.items = parseItems(schema[keyword]);
        break;

      case 'anyOf':
        field.type = 'checkbox';
        field.value = field.value || [];
        field.items = parseItems(schema[keyword]);
        break;
      }
    }
  }

  if (schema.name) {
    field.name = schema.name;

    setFormValue(vm, field);
  }

  return field;
};


export const loadFields = (vm, schema, fields = vm.fields) => {
  if (!schema || schema.visible === false) {
    return;
  }

  switch (schema.type) {
  case 'object':
    for (const key in schema.properties) {
      schema.properties[key].name = key;

      if (schema.required) {
        for (const field of schema.required) {
          if (schema.properties[field]) {
            schema.properties[field].required = true;
          }
        }
      }
      if(schema.name && !fields[schema.name]) {
        fields[schema.name] = { $sub: true };
      }
      loadFields(vm, schema.properties[key], schema.name ? fields[schema.name] : undefined);
    }
    break;

  case 'boolean':
    fields[schema.name] = parseBoolean(vm, schema);
    break;

  case 'array':
    fields[schema.name] = parseArray(vm, schema);
    break;

  case 'integer':
  case 'number':
  case 'string':
    for (const keyword of ARRAY_KEYWORDS) {
      if (schema.hasOwnProperty(keyword)) {
        schema.items = {
          type: schema.type,
          enum: schema[keyword],
        };
        fields[schema.name] = parseArray(vm, schema);
        return;
      }
    }
    fields[schema.name] = parseString(vm, schema);
    break;
  }
};
