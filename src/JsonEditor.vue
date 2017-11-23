<script>
  import { loadFields } from './parser';
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
      autocomplete: { type: String },
      /**
       * This Boolean attribute indicates that the form is not to be validated when submitted.
       */
      novalidate: { type: Boolean },
      /**
       * Define the inputs wrapping class. Leave `undefined` to disable input wrapping.
       */
      inputWrappingClass: { type: String },
    },
    data: () => ({
      default: {},
      fields: [],
      error: null,
      data: {},
    }),
    created() {
      loadFields(this, JSON.parse(JSON.stringify(this.schema)));
      this.default = { ...this.value };
      this.data = { ...this.value };
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
      if (this.fields.length) {
        const formNodes = [];
        this.fields.forEach((field) => {
          if (!field.value) {
            field.value = this.value[field.name];
          }
          const element = field.hasOwnProperty('items') && field.type !== 'select'
            ? components[`${ field.type }group`] || defaultGroup
            : components[field.type] || defaultInput;
          const fieldOptions = this.elementOptions(element, field, field);
          const children = [];
          const hasMultitpleElements = false;
          const input = {
            ref: field.name,
            domProps: {
              value: this.value[field.name],
            },
            on: {
              input: (event) => {
                const value = event && event.target ? event.target.value : event;
                this.$set(this.data, field.name, value);
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
              input.domProps.innerHTML = this.value[field.name];
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
          const inputElement = hasMultitpleElements
            ? createElement(element.component, input, children)
            : createElement(element.component, input, children);
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
        });
        const labelOptions = this.elementOptions(components.label);
        const button = this.$slots.hasOwnProperty('default')
          ? { component: this.$slots.default, option }
          : components.button;
        if (button.component instanceof Array) {
          formNodes.push(createElement(
            components.label.component, labelOptions, button.component));
        } else {
          const buttonOptions = this.elementOptions(button);
          const buttonElement = createElement(button.component, buttonOptions, button.option.label);
          formNodes.push(createElement(
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
        }, formNodes));
      }
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
        for (const key in this.default) {
          this.$set(this.data, key, this.default[key]);
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
