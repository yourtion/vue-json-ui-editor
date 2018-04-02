<script>
  import { loadFields } from './parser';
  import { initChild, getChild, setVal, deepClone } from './utils';
  const option = { native: true };
  const components = {
    title: { component: 'h1', option },
    description: { component: 'p', option },
    error: { component: 'div', option },
    form: { component: 'form', option },
    file: { component: 'input', option },
    label: { component: 'label', option },
    input: { component: 'input', option },
    radio: { component: 'input', option },
    select: { component: 'select', option },
    option: { component: 'option', option },
    button: {
      component: 'button',
      option: {
        ...option,
        type: 'submit',
        label: 'Submit',
      },
    },
    checkbox: { component: 'input', option },
    textarea: { component: 'textarea', option },
    radiogroup: { component: 'div', option },
    checkboxgroup: { component: 'div', option },
  };
  const defaultInput = { component: 'input', option };
  const defaultGroup = { component: 'div', option };

  /**
   * Edit JSON in UI form with JSON Schema and Vue.js `<json-editor>` component.
   *
   * @author Yourtion
   * @license MIT
   */
  export default {
    name: 'JsonEditor',
    props: {
      /**
       * The JSON Schema object. Use the `v-if` directive to load asynchronous schema.
       */
      schema: { type: Object, required: true },
      /**
       * Use this directive to create two-way data bindings with the component. It automatically picks the correct way to update the element based on the input type.
       * @model
       * @default {}
       */
      value: { type: Object, default: () => ({}) },
      /**
       * This property indicates whether the value of the control can be automatically completed by the browser. Possible values are: `off` and `on`.
       */
      autoComplete: { type: String },
      /**
       * This Boolean attribute indicates that the form is not to be validated when submitted.
       */
      noValidate: { type: Boolean },
      /**
       * Define the inputs wrapping class. Leave `undefined` to disable input wrapping.
       */
      inputWrappingClass: { type: String },
    },
    data() {
      return {
        default: {},
        fields: {},
        error: null,
        data: {},
      };
    },
    created() {
      loadFields(this, deepClone(this.schema));
      this.default = deepClone(this.value);
      this.data = deepClone(this.value);
    },
    render(createElement) {
      const nodes = [];
      if (this.schema.title) {
        nodes.push(createElement(
          components.title.component, this.schema.title));
      }
      if (this.schema.description) {
        nodes.push(createElement(
          components.description.component, this.schema.description));
      }
      if (this.error) {
        const errorOptions = this.elementOptions(components.error);
        const errorNodes = [];
        if (components.error.option.native) {
          errorNodes.push(this.error);
        }
        nodes.push(createElement(
          components.error.component, errorOptions, errorNodes));
      }
      const allFormNodes = [];
      const formNode = {
        root: {},
      };
      function createForm(fields, sub) {
        let node;
        if(sub) {
          node = setVal(formNode, sub.pop(), {});
        } else {
          node = formNode.root;
        }

        if (Object.keys(fields).length) {
          Object.keys(fields).forEach((key) => {
            const formNodes = [];
            if(key.indexOf('$') === 0) return;
            const field = fields[key];
            if(field.$sub) {
              return createForm.call(this, field, sub ? [ ...sub, key ] : [ key ]);
            }
            const fieldName = field.name;

            const fieldValue = getChild(this.value, fieldName.split('.'));
            if (!field.value) {
              field.value = fieldValue;
            }
            const customComponent = field.component ? { component: field.component, option: { }} : undefined;
            // eslint-disable-next-line
            const element = field.component ? customComponent : field.hasOwnProperty('items') && field.type !== 'select'
              ? components[`${ field.type }group`] || defaultGroup
              : components[field.type] || defaultInput;
            const fieldOptions = this.elementOptions(element, field, field);
            const children = [];

            const input = {
              ref: fieldName,
              domProps: {
                value: fieldValue,
              },
              on: {
                input: (event) => {
                  const value = event && event.target ? event.target.value : event;
                  const ns = fieldName.split('.');
                  const n = ns.pop();
                  const ret = (ns.length > 0 ? initChild(this.data, ns) : this.data);
                  this.$set(ret, n, value);
                  /**
                   * Fired synchronously when the value of an element is changed.
                   */
                  this.$emit('input', this.data);
                },
                change: this.changed,
              },
              ...fieldOptions,
            };
            delete field.value;
            switch (field.type) {
            case 'textarea':
              if (element.option.native) {
                input.domProps.innerHTML = fieldValue;
              }
              break;
            case 'radio':
            case 'checkbox':
              if (field.hasOwnProperty('items')) {
                field.items.forEach((item) => {
                  const itemOptions = this.elementOptions(
                    components[field.type], item, item, item);
                  children.push(createElement(
                    components[field.type].component, itemOptions, item.label));
                });
              }
              break;
            case 'select':
              if (!field.required) {
                children.push(createElement(components.option.component));
              }
              field.items.forEach((option) => {
                const optionOptions = this.elementOptions(components.option, {
                  value: option.value,
                }, field);
                children.push(createElement(components.option.component, {
                  domProps: {
                    value: option.value,
                  },
                  ...optionOptions,
                }, option.label));
              });
              break;
            }
            const inputElement = createElement(element.component, input, children);

            const formControlsNodes = [];
            if (field.label && !option.disableWrappingLabel) {
              const labelOptions = this.elementOptions(components.label, field, field);
              const labelNodes = [];
              if (components.label.option.native) {
                labelNodes.push(createElement('span', {
                  attrs: {
                    'data-required-field': field.required ? 'true' : 'false',
                  },
                }, field.label));
              }
              labelNodes.push(inputElement);
              if (field.description) {
                labelNodes.push(createElement('br'));
                labelNodes.push(createElement('small', field.description));
              }
              formControlsNodes.push(createElement(
                components.label.component, labelOptions, labelNodes));
            } else {
              formControlsNodes.push(inputElement);
              if (field.description) {
                formControlsNodes.push(createElement('br'));
                formControlsNodes.push(createElement('small', field.description));
              }
            }
            if (this.inputWrappingClass) {
              formNodes.push(createElement('div', {
                class: this.inputWrappingClass,
              }, formControlsNodes));
            } else {
              formControlsNodes.forEach((node) => formNodes.push(node));
            }
            node[key] = formNodes[0];
          });
        }
      }
      createForm.call(this, this.fields);

      function createNode(fields, sub) {
        const nodes = [];
        const subName = sub && sub.pop();
        if(fields.$title) {
          nodes.push(createElement('div', {
            class: 'sub-title',
          }, fields.$title));
        }
        Object.keys(fields).forEach((key) => {
          if(key.indexOf('$') === 0) return;
          const field = fields[key];
          if(field.$sub) {
            const node = createNode.call(this, field, sub ? [ ...sub, key ] : [ key ]);
            nodes.push(createElement('div', {
              class: 'sub',
            }, node));
          } else if(subName) {
            nodes.push(getChild(formNode, subName.split('.'))[key]);
          } else {
            nodes.push(formNode.root[key]);
          }
        });
        return nodes;
      }
      const formNodes = createNode.call(this, this.fields);
      allFormNodes.push(formNodes);

      const labelOptions = this.elementOptions(components.label);
      const button = this.$slots.hasOwnProperty('default')
        ? { component: this.$slots.default, option }
        : components.button;
      if (button.component instanceof Array) {
        allFormNodes.push(createElement(
          components.label.component, labelOptions, button.component));
      } else {
        const buttonOptions = this.elementOptions(button);
        const buttonElement = createElement(button.component, buttonOptions, button.option.label);
        allFormNodes.push(createElement(
          components.label.component, labelOptions, [ buttonElement ]));
      }
      const formOptions = this.elementOptions(components.form, {
        autocomplete: this.autocomplete,
        novalidate: this.novalidate,
      });
      nodes.push(createElement(components.form.component, {
        ref: '__form',
        on: {
          submit: (event) => {
            event.stopPropagation();
            this.submit(event);
          },
          invalid: this.invalid,
        },
        ...formOptions,
      }, allFormNodes));
      return createElement('div', nodes);
    },
    mounted() {
      this.reset();
    },
    setComponent(type, component, option = {}) {
      components[type] = { component, option };
    },
    methods: {
      /**
       * @private
       */
      optionValue(field, target, item = {}) {
        return typeof target === 'function'
          ? target({ vm: this, field, item })
          : target;
      },
      /**
       * @private
       */
      elementOptions(element, extendingOptions = {}, field = {}, item = {}) {
        const attrName = element.option.native ? 'attrs' : 'props';
        const elementProps = typeof element.option === 'function'
          ? element.option
          : { ...element.option, native: undefined };
        const options = this.optionValue(field, elementProps, item);
        return { [attrName]: { ...extendingOptions, ...options }};
      },
      /**
       * @private
       */
      changed(e) {
        /**
         * Fired when a change to the element's value is committed by the user.
         */
        this.$emit('change', e);
      },
      /**
       * Get a form input reference
       */
      input(name) {
        if (!this.$refs[name]) {
          throw new Error(`Undefined input reference '${ name }'`);
        }
        return this.$refs[name][0];
      },
      /**
       * Get the form reference
       */
      form() {
        return this.$refs.__form;
      },
      /**
       * Checks whether the form has any constraints and whether it satisfies them. If the form fails its constraints, the browser fires a cancelable `invalid` event at the element, and then returns false.
       */
      checkValidity() {
        return this.$refs.__form.checkValidity();
      },
      /**
       * @private
       */
      invalid(e) {
        /**
         * Fired when a submittable element has been checked and doesn't satisfy its constraints. The validity of submittable elements is checked before submitting their owner form, or after the `checkValidity()` of the element or its owner form is called.
         */
        this.$emit('invalid', e);
      },
      /**
       * Reset the value of all elements of the parent form.
       */
      reset() {
        for (const key in this.data) {
          const ns = key.split('.');
          const n = ns.pop();
          const ret = (ns.length > 0 ? initChild(this.data, ns) : this.data);
          const value = getChild(this.default, key.split('.'));
          this.$set(ret, n, value);
        }
      },
      /**
       * Send the content of the form to the server
       */
      submit(event) {
        if (this.checkValidity()) {
          /**
           * Fired when a form is submitted
           */
          this.$emit('submit', event);
        }
      },
      /**
       * Set a message error.
       */
      setErrorMessage(message) {
        this.error = message;
      },
      /**
       * clear the message error.
       */
      clearErrorMessage() {
        this.error = null;
      },
    },
  };
</script>
