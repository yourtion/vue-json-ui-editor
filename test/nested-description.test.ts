import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import JsonEditor from "../src/JsonEditor.vue";

describe("嵌套对象的 title/description 渲染", () => {
  it("嵌套 object 的 title 渲染为 .sub-title", () => {
    const wrapper = mount(JsonEditor, {
      props: {
        schema: {
          type: "object",
          properties: {
            address: {
              type: "object",
              title: "地址",
              name: "address",
              properties: {
                city: { type: "string", title: "城市" },
              },
            },
          },
        },
        modelValue: {},
      },
    });
    expect(wrapper.find(".sub-title").text()).toBe("地址");
  });

  it("嵌套 object 的 description 渲染为 .sub-description", () => {
    const wrapper = mount(JsonEditor, {
      props: {
        schema: {
          type: "object",
          properties: {
            address: {
              type: "object",
              title: "地址",
              description: "请填写常住地址",
              name: "address",
              properties: {
                city: { type: "string", title: "城市" },
              },
            },
          },
        },
        modelValue: {},
      },
    });
    expect(wrapper.find(".sub-description").text()).toBe("请填写常住地址");
  });

  it("无 description 的嵌套对象不渲染 .sub-description", () => {
    const wrapper = mount(JsonEditor, {
      props: {
        schema: {
          type: "object",
          properties: {
            address: {
              type: "object",
              title: "地址",
              name: "address",
              properties: {
                city: { type: "string", title: "城市" },
              },
            },
          },
        },
        modelValue: {},
      },
    });
    expect(wrapper.find(".sub-description").exists()).toBe(false);
  });
});
