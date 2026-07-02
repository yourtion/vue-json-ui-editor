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
            <span>Live Data</span>
          </div>
        </template>
        <el-tabs v-model="dataTab">
          <el-tab-pane label="Model" name="model">
            <pre class="json">{{ jsonString }}</pre>
          </el-tab-pane>
          <el-tab-pane label="Schema" name="schema">
            <pre class="json">{{ schemaString }}</pre>
          </el-tab-pane>
        </el-tabs>
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
import { ref, computed, h } from 'vue';
import JsonEditor from '../../src/JsonEditor.vue';
import { ElOption as Option, ElButton, ElIcon } from 'element-plus';
import { Plus, Delete } from '@element-plus/icons-vue';
import newsletterSchema from '../schema/newsletter.json';

// object 数组增删行按钮：圆形图标按钮（+ / 回收站），紧凑不抢字段空间
const AddIconButton = {
  render() {
    return h(ElButton, { circle: true, size: 'small', type: 'primary' }, () =>
      h(ElIcon, () => h(Plus)),
    );
  },
};
const RemoveIconButton = {
  render() {
    return h(ElButton, { circle: true, size: 'small', type: 'danger', plain: true }, () =>
      h(ElIcon, () => h(Delete)),
    );
  },
};

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
// object 数组增删行按钮 → 圆形图标按钮（+ 添加 / 回收站删除）
JsonEditor.setComponent('arrayadd', AddIconButton);
JsonEditor.setComponent('arrayremove', RemoveIconButton);

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
    sub2: {
      contacts: [
        { email: 'alice@example.com', role: 'admin' },
      ],
    },
  },
});

// Template ref
const jsonEditorRef = ref();

// 右侧 tab：Model / Schema 切换
const dataTab = ref('model');

// Computed property
const jsonString = computed(() => {
  return JSON.stringify(model.value, null, 2).trim();
});
const schemaString = computed(() => {
  return JSON.stringify(schema.value, null, 2).trim();
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
  max-height: 520px;
  overflow: auto;
  margin: 0;
}

/* object 数组增删行：行内字段横排，圆形删除按钮居右对齐 */
.json-editor-array-row {
  display: flex;
  gap: 10px;
  align-items: center;
  margin: 8px 0;
  padding: 10px;
  background: #f5f6f8;
  border-radius: 6px;
}
.json-editor-array-row-fields {
  flex: 1;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.json-editor-array-row-fields .el-form-item {
  margin-bottom: 0;
}
.json-editor-array-add {
  margin-top: 6px;
}
</style>
