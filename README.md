[![NPM version][npm-image]][npm-url]
[![build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]
[![David deps][david-image]][david-url]
[![npm download][download-image]][download-url]
[![npm license][license-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/vue-json-ui-editor.svg?style=flat-square
[npm-url]: https://npmjs.org/package/vue-json-ui-editor
[travis-image]: https://img.shields.io/travis/yourtion/vue-json-ui-editor.svg?style=flat-square
[travis-url]: https://travis-ci.org/yourtion/vue-json-ui-editor
[coveralls-image]: https://img.shields.io/coveralls/yourtion/vue-json-ui-editor.svg?style=flat-square
[coveralls-url]: https://coveralls.io/r/yourtion/vue-json-ui-editor?branch=master
[david-image]: https://img.shields.io/david/yourtion/vue-json-ui-editor.svg?style=flat-square
[david-url]: https://david-dm.org/yourtion/vue-json-ui-editor
[download-image]: https://img.shields.io/npm/dm/vue-json-ui-editor.svg?style=flat-square
[download-url]: https://npmjs.org/package/vue-json-ui-editor
[license-image]: https://img.shields.io/npm/l/vue-json-ui-editor.svg

# json-editor

[![Greenkeeper badge](https://badges.greenkeeper.io/yourtion/vue-json-ui-editor.svg)](https://greenkeeper.io/)
[![DeepScan grade](https://deepscan.io/api/teams/2046/projects/2774/branches/19927/badge/grade.svg)](https://deepscan.io/dashboard#view=project&tid=2046&pid=2774&bid=19927)

Edit JSON in UI form with JSON Schema and Vue.js `<json-editor>` component.

![ScreenShot](screenshot.jpg)

## Install

```bash
npm install vue-json-ui-editor --save
```

## Use

```Vue
<template>
<json-editor ref="JsonEditor" :schema="schema" v-model="model">
    <button @click="submit">submit</button>
    <button @click="reset">Reset</button>
</json-editor>
</template>

<script>
const SCHEMA = {
  type: 'object',
  title: 'vue-json-editor demo',
  properties: {
    name: {
      type: 'string',
    },
    email: {
      type: 'string',
    },
  },
};
// import vue-json-ui-editor
import JsonEditor from 'vue-json-ui-editor';
export default {
  components: { JsonEditor },
  data: () => ({
    // init json schma file ( require('@/schema/newsletter') )
    schema: SCHEMA,
    // data
    model: {
      name: 'Yourtion',
    },
  }),

  methods: {
    submit(_e) {
      alert(JSON.stringify(this.model));
    },
    reset() {
      this.$refs.JsonEditor.reset();
    },
  },
};
</script>
```

More info on: [Example-Subscription](example/components/Subscription.vue)
Schema: [newsletter.json](example/schema/newsletter.json)

## props

- `schema` ***Object*** (*required*)
The JSON Schema object. Use the `v-if` directive to load asynchronous schema.

- `v-model` ***Object*** (*optional*) `default: [object Object]`
Use this directive to create two-way data bindings with the component. It automatically picks the correct way to update the element based on the input type.

- `auto-complete` ***String*** (*optional*)
This property indicates whether the value of the control can be automatically completed by the browser. Possible values are: `off` and `on`.

- `no-validate` ***Boolean*** (*optional*)
This Boolean attribute indicates that the form is not to be validated when submitted.

- `input-wrapping-class` ***String*** (*optional*)
Define the inputs wrapping class. Leave `undefined` to disable input wrapping.

## data

- `default`
 *initial value:* `[object Object]`

- `fields`
 *initial value:* `[object Object]`

- `error`
 *initial value:* `null`

- `data`
 *initial value:* `[object Object]`

## events

- `input` Fired synchronously when the value of an element is changed.

- `change` Fired when a change to the element's value is committed by the user.

- `invalid` Fired when a submittable element has been checked and doesn't satisfy its constraints. The validity of submittable elements is checked before submitting their owner form, or after the `checkValidity()` of the element or its owner form is called.

- `submit` Fired when a form is submitted

## methods

- `input(name)`
Get a form input reference

- `form()`
Get the form reference

- `checkValidity()`
Checks whether the form has any constraints and whether it satisfies them. If the form fails its constraints, the browser fires a cancelable `invalid` event at the element, and then returns false.

- `reset()`
Reset the value of all elements of the parent form.

- `submit(event)`
Send the content of the form to the server

- `setErrorMessage(message)`
Set a message error.

- `clearErrorMessage()`
clear the message error.
