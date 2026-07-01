// src/utils.ts
export type RecordAny = Record<string, any>;

/**
 * Deep-clone a value, preserving cycles and special object types.
 *
 * Unlike `JSON.parse(JSON.stringify(obj))`, this:
 * - keeps circular references intact instead of throwing
 *   "Converting circular structure to JSON";
 * - clones Date / RegExp / Map / Set instead of mangling them into strings
 *   or empty objects;
 * - keeps functions by reference (they are not data).
 *
 * Used to snapshot `modelValue`/`schema`, which may originate from arbitrary
 * user objects, so being cycle- and type-safe matters more than speed.
 */
export const deepClone = <T>(obj: T): T => {
  if (obj === undefined || obj === null) return obj;
  if (typeof obj !== "object") return obj;

  // Tracks already-cloned objects so a cycle clones into an equivalent cycle
  // instead of recursing forever.
  const seen = new WeakMap<object, object>();

  const clone = (value: unknown): unknown => {
    if (value === undefined || value === null) return value;
    if (typeof value !== "object") return value;

    const hit = seen.get(value as object);
    if (hit !== undefined) return hit;

    if (value instanceof Date) {
      const copy = new Date(value.getTime());
      seen.set(value as object, copy);
      return copy;
    }
    if (value instanceof RegExp) {
      const copy = new RegExp(value.source, value.flags);
      seen.set(value as object, copy);
      return copy;
    }
    if (value instanceof Map) {
      const copy = new Map();
      seen.set(value as object, copy);
      value.forEach((v, k) => copy.set(clone(k), clone(v)));
      return copy;
    }
    if (value instanceof Set) {
      const copy = new Set();
      seen.set(value as object, copy);
      value.forEach((v) => copy.add(clone(v)));
      return copy;
    }

    const copy: RecordAny = Array.isArray(value) ? [] : {};
    seen.set(value as object, copy);
    for (const key of Object.keys(value)) {
      copy[key] = clone((value as RecordAny)[key]);
    }
    return copy;
  };

  return clone(obj) as T;
};

export function getExtendibleLeaf(
  obj: RecordAny,
  n: string,
  initIt: boolean,
): RecordAny | undefined {
  const v: unknown = obj[n];
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return v as RecordAny;
  }
  if (initIt && v === undefined) {
    // 数组索引路径：父是数组时按索引初始化一个对象（用于 array items 子字段）
    if (Array.isArray(obj)) {
      const idx = Number(n);
      if (Number.isInteger(idx)) {
        return (obj[idx] = {}) as RecordAny;
      }
    }
    return (obj[n] = {}) as RecordAny;
  }
  // 父是数组且索引处已有对象元素 → 返回该元素
  if (Array.isArray(obj) && v && typeof v === "object") {
    return v as RecordAny;
  }
  return undefined;
}

export const getChild = (data: RecordAny, ns: string[]): unknown => {
  if (data === null || data === undefined) return undefined;
  if (ns.length === 1) return data[ns[0]];
  let obj: unknown = data[ns[0]];
  if (obj === undefined) return obj;
  let i = 1;
  const end = ns.length - 1;
  for (; i < end; i++) {
    obj = getExtendibleLeaf(obj as RecordAny, ns[i], false);
    if (obj === undefined) return obj;
  }
  return (obj as RecordAny)[ns[i]];
};

// 判断路径段是否为数组索引（纯数字字符串）
const isArrayIndex = (seg: string): boolean => Number.isInteger(Number(seg));

// 按下一路径段决定容器类型：下一段是数字索引 → 建数组，否则建对象
function containerFor(nextSeg: string): RecordAny | unknown[] {
  return isArrayIndex(nextSeg) ? [] : {};
}

export const initChild = (data: RecordAny, ns: string[]): RecordAny => {
  if (ns.length === 1) {
    const ret = getExtendibleLeaf(data, ns[0], true);
    if (ret === undefined) {
      throw new TypeError("fail to init because namespace " + ns[0] + " = " + (data as any)[ns[0]]);
    }
    return ret;
  }
  let parent: RecordAny = data;
  let obj: RecordAny | undefined = data[ns[0]] as RecordAny | undefined;
  if (obj === undefined) obj = (data[ns[0]] = containerFor(ns[1])) as RecordAny;
  for (let i = 1; i < ns.length; i++) {
    const n = ns[i];
    const ret = getExtendibleLeaf(obj, n, true);
    if (ret === undefined) {
      throw new TypeError(
        "fail to init because namespace " + ns.join(".") + " = " + obj + "(" + typeof obj + ")",
      );
    }
    parent = obj;
    obj = ret;
    if ((parent as any)[n] === undefined) {
      throw new TypeError(
        "fail to init because namespace " + ns.slice(0, i).join(".") + " = " + parent,
      );
    }
  }
  return obj;
};

export const setVal = (data: RecordAny, n: string | string[], v: unknown): unknown => {
  const ns = Array.isArray(n) ? n : n.split(".");
  const key = ns.pop() as string;
  // 确保容器类型正确：若 key 是数组索引，最末层容器必须是数组
  if (ns.length > 0 && isArrayIndex(key)) {
    const parent = initChild(data, ns) as RecordAny;
    if (!Array.isArray(parent)) {
      // initChild 建了 {}，但本应是 []（因为最终 key 是数字索引）。
      // 把父节点（ns 末段指向的容器）替换为数组。
      const grandKey = ns[ns.length - 1] as string;
      const grand = ns.length > 1 ? (initChild(data, ns.slice(0, -1)) as RecordAny) : data;
      const arr: unknown[] = [];
      (grand as RecordAny)[grandKey] = arr;
      (arr as RecordAny)[key] = v;
      return v;
    }
    (parent as RecordAny)[key] = v;
    return v;
  }
  const ret = ns.length > 0 ? initChild(data, ns) : data;
  (ret as RecordAny)[key] = v;
  return v;
};
