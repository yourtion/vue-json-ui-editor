// 静态 API + expose 实例方法的公开类型。
// vue-tsc 对函数式 setup + return render 的 expose 类型生成有短板（生成的 d.ts 里
// expose 方法为空），这里导出类型让消费侧可用。
import type { ComponentOption } from "./index";

/**
 * JsonEditor 实例方法（通过 template ref 访问）。
 * 用法：`const ref = ref<InstanceType<typeof JsonEditor>>(); ref.value?.form().validate(cb)`
 *
 * 注：由于函数式 setup 的 expose 类型不会自动进组件类型，消费侧如需严格类型，
 * 可用 `(ref.value as unknown as JsonEditorInstance).form()`，或直接用本类型断言。
 */
export interface JsonEditorInstance {
  /** 取底层 form 元素/component 实例（注册为 el-form 时即 ElForm 实例，可 .validate(cb)） */
  form(): any;
  /** 取某字段名的底层 input 元素 */
  input(name: string): HTMLElement | undefined;
  /** 原生 form.checkValidity() */
  checkValidity(): boolean;
  /** 触发校验（异步） */
  validate(): Promise<void>;
  /** 重置表单值到初始 modelValue */
  reset(): void;
  /** 设置整表错误提示（渲染 error 组件） */
  setErrorMessage(message: string): void;
  /** 清除整表错误提示 */
  clearErrorMessage(): void;
  /** 取当前解析后的 fields 树（含 $sub 嵌套容器） */
  getFields(): Record<string, unknown>;
  /** 暴露的 vm（model/fields/error），供高级消费者/option 回调用 */
  readonly vm: {
    model: Record<string, unknown>;
    fields: Record<string, unknown>;
    error: string | null;
  };
}

/**
 * 静态 API：挂载在 JsonEditor 组件对象上的方法。
 * 用法：`JsonEditor.setComponent('text', ElInput)`
 */
export interface JsonEditorStatic {
  setComponent(type: string, component: string | object, option?: ComponentOption): void;
}
