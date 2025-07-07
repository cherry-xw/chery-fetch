import { isUndefined } from "lodash";
import baseRequest, {
  type TContext,
  type TOptions,
  type TQueryParams,
  type TRequestReturnType
} from "./base";
import CMiddleware from "./middleware";

const METHOD_LIST: API.Method[] = [
  "GET",
  "POST",
  "DELETE",
  "PUT",
  "PATCH",
  "OPTIONS",
  "HEAD",
  "TRACE",
  "CONNECT"
];
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  export namespace API {
    export type Method =
      | "GET"
      | "POST"
      | "DELETE"
      | "PUT"
      | "PATCH"
      | "OPTIONS"
      | "HEAD"
      | "TRACE"
      | "CONNECT";
    export type Context<T> = TContext<T>;
    export type Options<T> = TOptions<T>;
    export type QueryParams = TQueryParams;
    export type RequestReturnType<T> = TRequestReturnType<T>;

    export type Middleware<T> = CMiddleware<T>;
    export type MiddlewareHandle<T> = (
      ctx: T,
      next: (reset?: boolean) => Promise<void>
    ) => Promise<void>;
  }
}

import { processFetchInputAndOutput } from "./middleware/defaultMiddleware";
import { processCache } from "./middleware/localCache";
import { mergeIdenticalRequests } from "./middleware/mergeIdenticalRequests";

export type TConfig$1<T> = Omit<API.Options<T>, "url" | "method" | "params" | "middleware"> & {
  method?: API.Method;
  middleware?: API.Middleware<API.Context<T>>;
};
export type TConfig$2<T> = Omit<API.Options<T>, "method" | "params" | "middleware"> & {
  method?: API.Method;
  params?: API.QueryParams;
  middleware?: API.Middleware<API.Context<T>>;
};

/**
 * 添加默认中间件
 * 创建中间件实例，后添加的先执行，缓存逻辑必须放在请求逻辑之前执行，如果不调用next，那么所有后续的逻辑都会被跳过而不会执行
 */
const middleware = new CMiddleware<API.Context<any>>([
  processCache,
  mergeIdenticalRequests,
  processFetchInputAndOutput
]);

// 直接请求函数重载
/**
 * 无包装函数版本，直接发起请求
 * @param url 请求url
 * @param method 请求参数
 * @param params 请求参数
 * @param config 配置项
 * @returns 请求函数，中断请求，加载状态
 */
export function request<T = any>(
  url: string,
  method: API.Method,
  params?: API.QueryParams,
  config?: TConfig$1<T>
): API.RequestReturnType<T>;
/**
 * 无包装函数版本，直接发起请求
 * @param requestParam 全量请求参数object
 * @returns 请求函数，中断请求，加载状态
 */
export function request<T>(requestParam: TConfig$2<T>): API.RequestReturnType<T>;

export function request<T = any>(url: string, params?: API.QueryParams): API.RequestReturnType<T>;

export function request<T = any>(
  url: string,
  params?: API.QueryParams,
  config?: TConfig$1<T>
): API.RequestReturnType<T>;

export function request<T>(
  urlOrAll: string | TConfig$2<T>,
  method: API.QueryParams | API.Method | "" = "",
  params?: TConfig$1<T> | API.QueryParams,
  config?: TConfig$1<T>
) {
  if (typeof urlOrAll === "string") {
    if (typeof method === "string") {
      return baseRequest<T>({
        url: urlOrAll,
        method: method as API.Method,
        params,
        middleware,
        ...config
      });
    } else if (!isUndefined(params)) {
      return baseRequest<T>({
        url: urlOrAll,
        method: "GET",
        params: method as API.QueryParams,
        ...(params as TConfig$1<T>),
        middleware,
        ...config
      });
    }
  }
  return baseRequest({ middleware, method: "GET", params: {}, ...(urlOrAll as TConfig$2<T>) });
}

/**
 * 包装后请求函数重载
 */
export interface RequestOverload<T> {
  /**
   * 请求接口获取返回值
   * @param url 请求url路径
   * @param method 请求类型 get | post
   * @param params 请求参数
   * @param config 请求配置
   * @returns promise abort loadingRef可以解构使用，sync和loading只能通过返回值调用或者直接调用
   */
  <G extends Partial<T> & { [_key in string]: any }, R = Omit<T, keyof G> & G>(
    url: string,
    method: API.Method,
    params?: API.QueryParams,
    config?: TConfig$1<R>
  ): API.RequestReturnType<R>;
  /**
   * 请求接口获取返回值
   * @param url 请求url路径
   * @param params 请求参数
   * @param config 请求配置
   * @returns promise abort loadingRef可以解构使用，sync和loading只能通过返回值调用或者直接调用
   */
  <G extends Partial<T> & { [_key in string]: any }, R = Omit<T, keyof G> & G>(
    url: string,
    params?: API.QueryParams,
    config?: TConfig$1<R>
  ): API.RequestReturnType<R>;
}

// 包装函数重载
/**
 * 注册服务（注册请求前缀，注入内置参数）
 * @param prefixURL 服务器url部分
 */
export function ServeCreator<T = any>(prefixURL: string): RequestOverload<T>;
/**
 * 注册服务（注册请求前缀，注入内置参数）
 * @param prefixURL 服务器url部分
 * @param method 配置默认请求类型
 * @param config 配置默认参数(可选)
 */
export function ServeCreator<T = any>(
  prefixURL: string,
  method: API.Method,
  config?: TConfig$1<T>
): RequestOverload<T>;
/**
 * 注册服务（注册请求前缀，注入内置参数）
 * @param prefixURL 服务器url部分
 * @param config 配置默认参数
 * @returns promise返回值
 */
export function ServeCreator<T = any>(prefixURL: string, config: TConfig$1<T>): RequestOverload<T>;

/**
 * 注册服务（注册请求前缀，注入内置参数）
 * @param prefixURL 服务器路径
 * @param methodOrConfig 请求方式，或者是默认配置项
 * @param defaultConfig 默认的配置项
 * @returns promise返回值
 */
export function ServeCreator<T = any>(
  prefixURL: string,
  methodOrConfig: API.Method | TConfig$1<T> = "GET",
  defaultConfig?: TConfig$1<T>
) {
  // 构建请求参数
  const options: API.Options<T> = { url: "", middleware, method: "GET", params: {} };
  if (methodOrConfig && typeof methodOrConfig === "string") {
    options.method = methodOrConfig;
    if (defaultConfig) {
      Object.assign(options, defaultConfig);
    }
  } else if (methodOrConfig) {
    Object.assign(options, defaultConfig);
  }
  return function request<G = T>(
    url: string,
    methodOrParams?: API.Method | API.QueryParams,
    paramsOrConfig?: API.QueryParams | TConfig$1<G>,
    config?: TConfig$1<G>
  ) {
    // 如果是一个简单字符串
    // 如果第二个参数是字符串，说明没有传入默认类型
    const rOptions = Object.assign({}, options);
    if (typeof methodOrParams === "string") {
      if (METHOD_LIST.includes(methodOrParams as any)) {
        rOptions.method = methodOrParams as any;
        // 先合并后面的
        if (config) {
          Object.assign(rOptions, config);
        }
        // 前面的优先级更高替换后面的值
        if (paramsOrConfig) {
          rOptions.params = paramsOrConfig;
        }
      } else {
        throw new Error("不支持的Method类型");
      }
    } else {
      // methodOrParams肯定是params， paramsOrConfig如果存在，肯定是config，config这时候肯定是空的
      Object.assign(rOptions, paramsOrConfig);
      rOptions.params = methodOrParams;
    }
    return baseRequest<G>(Object.assign({} as API.Options<G>, rOptions, { url: prefixURL + url }));
  };
}

// 导出所有中间件逻辑
export { processFetchInputAndOutput, processCache, mergeIdenticalRequests };
export const Middleware = CMiddleware;
// 导出所有其他相关
export * as RequestUtils from "./utils";
