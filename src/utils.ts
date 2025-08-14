import type {
  DeepCloneFunction,
  GetChildFunction,
  InitChildFunction,
  SetValFunction,
} from "./types";

export const deepClone: DeepCloneFunction = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

export function getExtendibleLeaf(
  obj: Record<string, unknown>,
  n: string,
  initIt: boolean,
): Record<string, unknown> | undefined {
  const v: unknown = obj[n];
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  if (initIt && v === undefined) {
    return (obj[n] = {}) as Record<string, unknown>;
  }
  return undefined;
}

export const getChild: GetChildFunction = (
  data: Record<string, unknown>,
  ns: string[],
): unknown => {
  if (ns.length === 1) {
    return data[ns[0]];
  }
  let obj: unknown = data[ns[0]];
  if (obj === undefined) return obj;
  let i = 1;
  const end: number = ns.length - 1;
  for (; i < end; i++) {
    obj = getExtendibleLeaf(obj as Record<string, unknown>, ns[i], false);
    if (obj === undefined) return obj;
  }
  return (obj as Record<string, unknown>)[ns[i]];
};

export const initChild: InitChildFunction = (
  data: Record<string, unknown>,
  ns: string[],
): Record<string, unknown> => {
  if (ns.length === 1) {
    const ret: Record<string, unknown> | undefined = getExtendibleLeaf(data, ns[0], true);
    if (ret === undefined) {
      throw new TypeError("fail to init because namespace " + ns[0] + " = " + data[ns[0]]);
    }
    return ret;
  }
  let parent: Record<string, unknown> = data;
  let obj: Record<string, unknown> | undefined = data[ns[0]] as Record<string, unknown> | undefined;
  if (obj === undefined) obj = data[ns[0]] = {} as Record<string, unknown>;
  for (let i = 1; i < ns.length; i++) {
    const n: string = ns[i];
    const ret: Record<string, unknown> | undefined = getExtendibleLeaf(obj, n, true);
    if (ret === undefined) {
      throw new TypeError(
        "fail to init because namespace " + ns.join(".") + " = " + obj + "(" + typeof obj + ")",
      );
    }
    parent = obj;
    obj = ret;
    if (parent[n] === undefined) {
      throw new TypeError(
        "fail to init because namespace " + ns.slice(0, i).join(".") + " = " + parent,
      );
    }
  }
  return obj;
};

export const setVal: SetValFunction = (
  data: Record<string, unknown>,
  n: string | string[],
  v: unknown,
): unknown => {
  const ns: string[] = Array.isArray(n) ? n : n.split(".");
  // eslint-disable-next-line
  const key: string = ns.pop() as string;
  const ret: Record<string, unknown> = ns.length > 0 ? initChild(data, ns) : data;
  ret[key] = v;
  return v;
};
