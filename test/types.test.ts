import { describe, it, expect } from "vitest";
import { JsonEditor } from "../src";
import type { JsonEditorInstance, JsonEditorStatic, ComponentConfig, OptionContext } from "../src";

/**
 * 类型层面验证：setComponent 静态方法 + 导出的 ctx/config 类型可被消费侧直接使用，
 * 无需 `as any`。运行时为空操作（纯类型断言），用 expect(...).toBeTypeOf 兜底确保不是 undefined。
 */
describe("公开类型可消费", () => {
  it("JsonEditor.setComponent 有正式类型（无需 as any）", () => {
    // 若 setComponent 类型缺失，这行会编译报错
    const fn: JsonEditorStatic["setComponent"] = JsonEditor.setComponent;
    expect(typeof fn).toBe("function");
  });

  it("ComponentConfig / OptionContext 类型可被引用", () => {
    const cfg: ComponentConfig = { component: "input", option: {} };
    const ctx: Partial<OptionContext> = { item: {} };
    expect(cfg.component).toBe("input");
    expect(ctx.item).toEqual({});
  });

  it("JsonEditorInstance 类型可被引用（expose 方法签名）", () => {
    const inst = {} as JsonEditorInstance;
    // 仅类型层面使用，确认 form/reset 等方法签名可访问
    expect(typeof inst.form).toBe("undefined"); // 空对象，运行时 undefined
    expect(typeof inst.reset).toBe("undefined");
  });
});
