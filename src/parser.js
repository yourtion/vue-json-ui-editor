'use strict'

const ARRAY_KEYWORDS = ['anyOf', 'oneOf', 'enum']

const setCommonFields = (schema, field) => {
  field.value = schema.hasOwnProperty('default')
    ? schema.default
    : field.hasOwnProperty('value') ? field.value : ''

  field.schemaType = schema.type
  field.label = schema.title || ''
  field.description = schema.description || ''
  field.required = schema.required || false
  field.disabled = schema.disabled || false
}

const setFormValue = (vm, field) => {
  if (vm.value && !vm.value[field.name]) {
    vm.$set(vm.value, field.name, field.value)
  }
}

export const loadFields = (vm, schema) => {
  if (!schema || schema.visible === false) {
    return
  }

  switch (schema.type) {
    case 'object':
      for (let key in schema.properties) {
        schema.properties[key].name = key

        if (schema.required) {
          for (let field of schema.required) {
            if (schema.properties[field]) {
              schema.properties[field].required = true
            }
          }
        }

        loadFields(vm, schema.properties[key])
      }
      break

    case 'boolean':
      vm.fields.push(parseBoolean(vm, schema))
      break

    case 'array':
      vm.fields.push(parseArray(vm, schema))
      break

    case 'integer':
    case 'number':
    case 'string':
      for (let keyword of ARRAY_KEYWORDS) {
        if (schema.hasOwnProperty(keyword)) {
          schema.items = {
            type: schema.type,
            enum: schema[keyword]
          }
          vm.fields.push(parseArray(vm, schema))
          return
        }
      }
      vm.fields.push(parseString(vm, schema))
      break
  }
}

export const parseBoolean = (vm, schema) => {
  let field = schema.attrs || {}

  setCommonFields(schema, field)

  if (!field.type) {
    field.type = 'checkbox'
  }

  field.checked = schema.checked || false
  
  if (schema.name) {
    field.name = schema.name

    setFormValue(vm, field)
  }

  return field
}

export const parseString = (vm, schema) => {
  let field = schema.attrs || {}

  if (!field.type) {
    switch (schema.type) {
      case 'number':
      case 'integer':
        field.type = 'number'
        break
      default:
        field.type = 'text'
    }
  }

  if (schema.format) {
    switch (schema.format) {
      case 'email':
        if (!field.type) {
          field.type = 'email'
        }
        break
      case 'uri':
        if (!field.type) {
          field.type = 'url'
        }
        break
      case 'regex':
        if (!field.type) {
          field.type = 'text'
        }

        field.pattern = schema.format
        break
    }
  }

  setCommonFields(schema, field)

  if (schema.name) {
    field.name = schema.name

    setFormValue(vm, field)
  }

  if (schema.minLength) {
    field.minlength = schema.minLength
  }

  if (schema.maxLength) {
    field.maxlength = schema.maxLength
  }

  return field
}

export const parseItems = (items) => {
  return items.map((item) => {
    if (typeof item !== 'object') {
      return { value: item, label: item }
    }

    return item
  })
}

export const parseArray = (vm, schema) => {
  let field = schema.attrs || {}

  setCommonFields(schema, field)

  field.multiple = schema.minItems > 1
  field.items = []

  loop:
    for (let keyword of ARRAY_KEYWORDS) {
      if (schema.hasOwnProperty(keyword)) {
        switch (keyword) {
          case 'enum':
            if (!field.type) {
              field.type = 'select'
            }
            field.value = field.value || ''
            field.items = parseItems(schema[keyword])
            break loop

          case 'oneOf':
            field.type = 'radio'
            field.value = field.value || ''
            field.items = parseItems(schema[keyword])
            break loop

          case 'anyOf':
            field.type = 'checkbox'
            field.value = field.value || []
            field.items = parseItems(schema[keyword])
            break loop
        }
      }
    }

  if (schema.name) {
    field.name = schema.name

    setFormValue(vm, field)
  }

  return field
}
