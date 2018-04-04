'use strict';
const { initChild, getChild } = require('./utils');

const ARRAY_KEYWORDS = [ 'anyOf', 'oneOf', 'enum' ];

const setCommonFields = (schema, field, schemaName) => {
  // eslint-disable-next-line no-nested-ternary
  field.value = schema.hasOwnProperty('default')
    ? schema.default
    : field.hasOwnProperty('value') ? field.value : '';

  field.component = schema.component;
  field.schemaType = schema.type;
  field.label = schema.title || '';
  field.description = schema.description || '';
  field.required = schema.required || false;
  field.disabled = schema.disabled || false;
  field.name = schemaName;
};

const setFormValue = (vm, field) => {
  const ns = field.name.split('.');
  const vmValue = getChild(vm.value, ns);
  if (vm.value && !vmValue) {
    const n = ns.pop();
    const ret = (ns.length > 0 ? initChild(vm.value, ns) : vm.value);
    vm.$set(ret, n, field.value);
  }
};


export const parseBoolean = (vm, schema, schemaName) => {
  const field = schema.attrs || {};

  setCommonFields(schema, field, schemaName);

  if (!field.type) {
    field.type = 'checkbox';
  }

  field.checked = schema.checked || false;

  if (schema.name) {
    field.name = schemaName;

    setFormValue(vm, field);
  }

  return field;
};

export const parseString = (vm, schema, schemaName) => {
  const field = schema.attrs || {};

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

      field.pattern = schema.pattern;
      break;
    }
  }

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

export const parseItems = (items) => {
  return items.map((item) => {
    if (typeof item !== 'object') {
      return { value: item, label: item };
    }

    return item;
  });
};

export const parseArray = (vm, schema, schemaName) => {
  const field = schema.attrs || {};

  setCommonFields(schema, field, schemaName);

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
  if(!field.type) {
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

export const loadFields = (vm, schema, fields = vm.fields, sub) => {
  if (!schema || schema.visible === false) return;

  const schemaName = sub ? sub.join('.') : schema.name;

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
      if(schema.name && !fields[schemaName]) {
        fields[schemaName] = {
          $sub: true,
          $title: schema.title,
          $description: schema.description,
        };
      }
      loadFields(vm, schema.properties[key], schema.name ? fields[schemaName] : undefined, sub ? [ ...sub, key ] : [ key ]);
    }
    break;

  case 'boolean':
    fields[schemaName] = parseBoolean(vm, schema, schemaName);
    break;

  case 'array':
    fields[schemaName] = parseArray(vm, schema, schemaName);
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
        fields[schemaName] = parseArray(vm, schema, schemaName);
        return;
      }
    }
    fields[schemaName] = parseString(vm, schema, schemaName);
    break;
  default:
    fields[schemaName] = parseString(vm, schema, schemaName);
  }

};
