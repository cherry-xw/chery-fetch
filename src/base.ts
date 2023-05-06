import { nanoid } from "nanoid";
import Middleware from "./middleware";

export type TQueryParams = BodyInit | URLSearchParams | Record<string, any> | string[][] | void;

export type TRequestReturnType<T> = {
  /**
   * 发送请求，获取数据，函数仅允许调用一次
   * @param eachMiddlewareInject 每个中间件执行注入逻辑
   * @returns 返回值
   */
  promise: (eachMiddlewareInject?: (ctx: TContext<T>, state: "enter" | "exit", functionName?: string) => void) => Promise<T>;
  /**
   * 发送请求，获取数据
   */
  sync: Promise<T>;
  /**
   * 发出请求后取消中断
   * @param reason 取消原因
   */
  abort: (reason?: any) => void;
  /**
   * 等待状态，不允许解构
   */
  readonly loading: boolean;
  /**
   * 等待状态，可以解构，数据在 `.state` 中
   */
  loadingRef: { readonly state: boolean };
};
export interface TOptions<T> {
  method: API.Method;
  url: string;
  /**
   * 基本入参使用该字段完成，如果是form或者blob、stream类型等使用paramsSerializer回调注入数据
   */
  params: TQueryParams;
  /**
   * 使用自定义中间件，如果使用该值，需要手动添加 defaultMiddleware.ts 中的两个函数，亦或者自己实现一个这样的函数
   */
  middleware: Middleware<TContext<T>>;
  headers?: Record<string, string>;
}
export type TContext<T> = {
  /**
   * 标记当前ctx是否已经被消费
   */
  consumed: boolean;
  /**
   * 请求相关的所有数据，traceId每个请求的追踪id，options请求所有配置参数，controller请求中断函数
   */
  request: { traceId: string; options: TOptions<T>; controller: AbortController } & Record<string, any>;
  /**
   * 响应相关所有数据，result请求响应原生数据，error请求错误或中间件执行错误，data最终返回的数据
   */
  response: { result?: Response; error?: any; data?: T } & { [key: string]: any };
};

/**
 * 基本请求函数
 * @param {TOptions<T>} options 配置项
 * @returns {TRequestReturnType<T>} promise abort loadingRef可以解构使用，sync和loading只能通过返回值调用或者直接调用
 */
function request<T>(options: TOptions<T>): TRequestReturnType<T> {
  if (!options.middleware) {
    throw new Error("middleware cannot be empty, Please check the incoming parameters");
  }
  const loading = { state: false };
  const ctx: TContext<T> = { consumed: false, request: { options, controller: new AbortController(), traceId: nanoid() }, response: {} };
  const promise: (eachMiddlewareInject?: (ctx: TContext<T>, state: "enter" | "exit", functionName?: string) => void) => Promise<T> =
    async function promise(eachMiddlewareInject) {
      if (ctx.consumed) {
        throw new Error(".promise or .sync only allowed to execute once");
      }
      ctx.consumed = true;
      loading.state = true;
      await options.middleware.exec(ctx, eachMiddlewareInject);
      loading.state = false;
      if (ctx.response.error) {
        throw ctx.response.error;
      }
      return ctx.response.data as T;
    };
  return {
    get sync() {
      return promise();
    },
    get abort() {
      return ctx.request.controller.abort.bind(ctx.request.controller);
    },
    get loading() {
      return loading.state;
    },
    promise,
    loadingRef: loading
  };
}

export default request;
