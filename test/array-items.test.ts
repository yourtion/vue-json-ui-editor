import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import JsonEditor from "../src/JsonEditor.vue";

const usersSchema = {
  type: "object",
  properties: {
    users: {
      type: "array",
      title: "用户列表",
      items: {
        type: "object",
        properties: {
          name: { type: "string", title: "姓名" },
          age: { type: "integer", title: "年龄" },
        },
      },
    },
  },
};

describe("object 数组增删行", () => {
  it("初始空数组 → 渲染「添加」按钮，无行", () => {
    const wrapper = mount(JsonEditor, {
      props: { schema: usersSchema, modelValue: { users: [] } },
    });
    expect(wrapper.find(".json-editor-array-add").exists()).toBe(true);
    expect(wrapper.findAll(".json-editor-array-row").length).toBe(0);
  });

  it("点「添加」→ 增加一行，行内渲染 items 的字段输入", async () => {
    const wrapper = mount(JsonEditor, {
      props: { schema: usersSchema, modelValue: { users: [] } },
    });
    await wrapper.find(".json-editor-array-add").trigger("click");
    expect(wrapper.findAll(".json-editor-array-row").length).toBe(1);
    // 行内应有 name + age 两个输入
    const row = wrapper.find(".json-editor-array-row");
    expect(row.findAll("input").length).toBeGreaterThanOrEqual(2);
  });

  it("点「删除」→ 减少一行", async () => {
    const wrapper = mount(JsonEditor, {
      props: { schema: usersSchema, modelValue: { users: [] } },
    });
    await wrapper.find(".json-editor-array-add").trigger("click");
    await wrapper.find(".json-editor-array-add").trigger("click");
    expect(wrapper.findAll(".json-editor-array-row").length).toBe(2);
    await wrapper.findAll(".json-editor-array-remove")[0].trigger("click");
    expect(wrapper.findAll(".json-editor-array-row").length).toBe(1);
  });

  it("初始 modelValue 有数据 → 渲染已有行", () => {
    const wrapper = mount(JsonEditor, {
      props: {
        schema: usersSchema,
        modelValue: { users: [{ name: "alice", age: 30 }] },
      },
    });
    expect(wrapper.findAll(".json-editor-array-row").length).toBe(1);
    const inputs = wrapper.findAll(".json-editor-array-row input");
    expect((inputs[0].element as HTMLInputElement).value).toBe("alice");
  });

  it("行内输入 → 更新 modelValue 对应数组元素", async () => {
    const wrapper = mount(JsonEditor, {
      props: { schema: usersSchema, modelValue: { users: [{ name: "", age: 0 }] } },
    });
    const inputs = wrapper.findAll(".json-editor-array-row input");
    await inputs[0].setValue("bob");
    // modelValue 是同一引用（Vue 2 语义），users[0].name 应更新
    const emitted = (wrapper.props("modelValue") as { users: Array<{ name: string }> }).users[0]
      .name;
    expect(emitted).toBe("bob");
  });
});
