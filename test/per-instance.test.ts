import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import JsonEditor from "../src/JsonEditor.vue";

// 两个标记性的自定义组件，用于验证 per-instance 配置互不污染
const CompA = defineComponent({ name: "CompA", render: () => h("span", { class: "comp-a" }, "A") });
const CompB = defineComponent({ name: "CompB", render: () => h("span", { class: "comp-b" }, "B") });

const schema = {
  type: "object",
  properties: { name: { type: "string", title: "Name" } },
};

describe("per-instance components prop", () => {
  it("传 components prop → 用实例配置渲染（覆盖全局默认）", () => {
    const wrapper = mount(JsonEditor, {
      props: {
        schema,
        modelValue: {},
        components: { text: CompA },
      },
    });
    expect(wrapper.find(".comp-a").exists()).toBe(true);
    expect(wrapper.find(".comp-b").exists()).toBe(false);
  });

  it("两个实例并存，各自 components prop 互不影响", () => {
    // 同时挂两个 editor，验证模块级单例不再导致互相污染
    const Parent = defineComponent({
      components: { JsonEditor },
      render() {
        return h("div", [
          h(JsonEditor, {
            schema,
            modelValue: {},
            components: { text: CompA },
            ref: "a" as never,
          }),
          h(JsonEditor, {
            schema,
            modelValue: {},
            components: { text: CompB },
            ref: "b" as never,
          }),
        ]);
      },
    });
    const wrapper = mount(Parent);
    expect(wrapper.find(".comp-a").exists()).toBe(true);
    expect(wrapper.find(".comp-b").exists()).toBe(true);
  });

  it("不传 components prop → 回退全局默认（向后兼容）", () => {
    const wrapper = mount(JsonEditor, {
      props: { schema, modelValue: {} },
    });
    // 默认 text 渲染原生 input（非自定义组件）
    expect(wrapper.find("input").exists()).toBe(true);
  });
});
