import { describe, it, expect } from "vitest";
import { getChild, setVal } from "../src/utils";

describe("utils - 数组索引路径支持", () => {
  describe("getChild 跨数组读取", () => {
    it("路径含数字索引 → 读取数组元素的字段", () => {
      const data = { users: [{ name: "alice" }, { name: "bob" }] };
      expect(getChild(data, ["users", "0", "name"])).toBe("alice");
      expect(getChild(data, ["users", "1", "name"])).toBe("bob");
    });

    it("数字索引越界 → undefined", () => {
      const data = { users: [{ name: "alice" }] };
      expect(getChild(data, ["users", "5", "name"])).toBeUndefined();
    });

    it("数组为空 → undefined", () => {
      const data = { users: [] };
      expect(getChild(data, ["users", "0", "name"])).toBeUndefined();
    });

    it("顶层即数组索引", () => {
      const data = [{ name: "a" }];
      expect(getChild(data, ["0", "name"])).toBe("a");
    });
  });

  describe("setVal 跨数组写入", () => {
    it("路径含数字索引 → 写入数组元素的字段", () => {
      const data: Record<string, unknown> = { users: [{ name: "" }, { name: "" }] };
      setVal(data, ["users", "0", "name"], "alice");
      expect((data.users as Array<Record<string, unknown>>)[0].name).toBe("alice");
    });

    it("写入不存在的索引 → 自动扩容数组", () => {
      const data: Record<string, unknown> = { users: [] };
      setVal(data, ["users", "0", "name"], "first");
      expect((data.users as Array<Record<string, unknown>>)[0].name).toBe("first");
    });

    it("写入时数组不存在 → 自动创建", () => {
      const data: Record<string, unknown> = {};
      setVal(data, ["tags", "0"], "x");
      expect(data.tags).toEqual(["x"]);
    });
  });
});
