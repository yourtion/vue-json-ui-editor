import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import JsonEditor from "../src/JsonEditor.vue";

describe("disabled / readOnly 透传", () => {
  it("schema.disabled:true → 渲染出的 <input> 带 disabled 属性", () => {
    const wrapper = mount(JsonEditor, {
      props: {
        schema: {
          type: "object",
          properties: { name: { type: "string", title: "Name", disabled: true } },
        },
        modelValue: {},
      },
    });
    const input = wrapper.find("input");
    expect(input.exists()).toBe(true);
    expect(input.attributes("disabled")).toBeDefined();
  });

  it("schema.disabled 未设 → <input> 无 disabled 属性", () => {
    const wrapper = mount(JsonEditor, {
      props: {
        schema: {
          type: "object",
          properties: { name: { type: "string", title: "Name" } },
        },
        modelValue: {},
      },
    });
    expect(wrapper.find("input").attributes("disabled")).toBeUndefined();
  });

  it("schema.readOnly:true → <input> 带 readonly 属性 + 视同 disabled", () => {
    const wrapper = mount(JsonEditor, {
      props: {
        schema: {
          type: "object",
          properties: { code: { type: "string", title: "Code", readOnly: true } },
        },
        modelValue: {},
      },
    });
    const input = wrapper.find("input");
    // readOnly 同时设置 readonly 与 disabled（只读字段不应可编辑）
    expect(input.attributes("readonly")).toBeDefined();
    expect(input.attributes("disabled")).toBeDefined();
  });

  it("disabled 字段渲染出的 <textarea> 也带 disabled", () => {
    const wrapper = mount(JsonEditor, {
      props: {
        schema: {
          type: "object",
          properties: {
            note: { type: "string", title: "Note", disabled: true, attrs: { type: "textarea" } },
          },
        },
        modelValue: {},
      },
    });
    const ta = wrapper.find("textarea");
    expect(ta.exists()).toBe(true);
    expect(ta.attributes("disabled")).toBeDefined();
  });
});
