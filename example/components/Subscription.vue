<template>
  <el-row>
    <el-col :span="12">
      <el-card class="form">
        <json-editor ref="jsonEditorRef" :schema="schema" v-model="model">
          <el-button type="primary" @click="submit">Subscribe</el-button>
          <el-button type="reset" @click="reset">Reset</el-button>
        </json-editor>
      </el-card>
    </el-col>
    <el-col :span="12">
      <el-card class="box-card">
        <template #header>
          <div class="clearfix">
            <span>Model</span>
          </div>
        </template>
        <pre class="json">{{ jsonString }}</pre>
      </el-card>
      <br />
      <el-card class="box-card">
        <template #header>
          <div class="clearfix">
            <span>How to use</span>
          </div>
        </template>
        <div class="json">
          <p>GitHub: <a href="https://github.com/yourtion/vue-json-ui-editor" target="_blank">vue-json-ui-editor</a></p>
          <p>NPM: <a href="https://www.npmjs.com/package/vue-json-ui-editor" target="_blank">json-editor</a></p>
        </div>
      </el-card>
    </el-col>
  </el-row>
</template>

<script setup>
import { ref, computed } from 'vue';
import JsonEditor from '../../src/JsonEditor.vue';
import { ElOption as Option } from 'element-plus';
import newsletterSchema from '../schema/newsletter.json';

// Configure JsonEditor components
JsonEditor.setComponent('form', 'el-form', ({ vm }) => {
  // vm is the JsonEditor VM

  const labelWidth = '120px';
  const model = vm.model;
  const rules = {};

  function parseField(fields) {
    Object.keys(fields).forEach(key => {
      if (key.indexOf('$') === 0 && key !== '$sub') return;
      const field = fields[key];
      if (field.$sub) {
        return parseField(field);
      }
      if (!field.name) return;
      rules[field.name] = [];
      // http://element.eleme.io/#/en-US/component/form#validation
      const type = field.schemaType === 'array' && field.type === 'radio' ? 'string' : field.schemaType;
      const required = field.required;
      const message = field.title;
      const trigger = ['radio', 'checkbox', 'select'].includes(field.type) ? 'change' : 'blur';
      rules[field.name].push({ type, required, message, trigger });

      if (field.minlength !== undefined || field.maxlength !== undefined) {
        const max = field.maxlength || 255;
        const min = field.minlength || 0;
        const msg = `Length must between ${ min } and ${ max }`;
        rules[field.name].push({ min, max, message: msg, trigger });
      }
    });
  }

  parseField(vm.fields);

  // returning the form props
  return { labelWidth, rules, model };
});

// http://element.eleme.io/#/en-US/component/form#validation
// 注意：el-form-item 的标签文字来自 label prop（非默认插槽），回调须返回 label。
JsonEditor.setComponent('label', 'el-form-item', ({ field }) => ({
  prop: field.name,
  label: field.label,
}));

JsonEditor.setComponent('email', 'el-input');
JsonEditor.setComponent('url', 'el-input');
JsonEditor.setComponent('number', 'el-input-number');
JsonEditor.setComponent('text', 'el-input');
JsonEditor.setComponent('textarea', 'el-input');
JsonEditor.setComponent('checkbox', 'el-checkbox');
JsonEditor.setComponent('checkboxgroup', 'el-checkbox-group');
JsonEditor.setComponent('radio', 'el-radio');
JsonEditor.setComponent('radiogroup', 'el-radio-group');
JsonEditor.setComponent('select', 'el-select');
JsonEditor.setComponent('switch', 'el-switch');
JsonEditor.setComponent('color', 'el-color-picker');
JsonEditor.setComponent('rate', 'el-rate');
JsonEditor.setComponent('date', 'el-date-picker');

// You can also use the component object
JsonEditor.setComponent('option', Option);

// By default `<h1/>` is used to render the form title.
// To override this, use the `title` type:
JsonEditor.setComponent('title', 'h2');

// By default `<p/>` is used to render the form title.
// To override this, use the `description` type:
JsonEditor.setComponent('description', 'small');

// By default `<div/>` is used to render the message error.
// To override this, use the `error` type:
JsonEditor.setComponent('error', 'el-alert', ({ vm }) => ({
  type: 'error',
  title: vm.error,
}));

// Reactive data
const schema = ref(newsletterSchema);
const model = ref({
  name: 'Yourtion',
  sub: {
    sEmail: 'yourtion@gmail.com',
  },
  contacts: [
    { email: 'alice@example.com', role: 'admin' },
  ],
});

// Template ref
const jsonEditorRef = ref();

// Computed property
const jsonString = computed(() => {
  return JSON.stringify(model.value, null, 2).trim();
});

// Methods
const submit = (_e) => {
  jsonEditorRef.value.form().validate(valid => {
    if (valid) {
      // model.value contains the valid data according your JSON Schema.
      // You can submit your model to the server here

      jsonEditorRef.value.clearErrorMessage();
    } else {
      jsonEditorRef.value.setErrorMessage('Please fill out the required fields');
      return false;
    }
  });
};

const reset = () => {
  jsonEditorRef.value.reset();
};
</script>

<style>
.form {
  text-align: left;
  width: 90%;
  margin: auto;
}

h2 {
  font-size: 1.7em;
  text-align: center;
  margin-top: 0;
  margin-bottom: 0.2em;
}

h2 + small {
  display: block;
  text-align: center;
  margin-bottom: 1.2em;
}

small {
  line-height: 20px;
  display: block;
}

.el-alert {
  margin-bottom: 15px;
}

.el-form .sub {
  margin-left: 10%;
}

.json {
  text-align: left;
}
</style>
