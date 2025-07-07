import { isObject, isObjectLike } from "lodash";
import * as utils from "../utils";
// import "isomorphic-fetch";

function prepareFetchParams<T = any>(option: API.Options<T>, controller: AbortController) {
  // 声明header实例
  const headers = new Headers();
  // 先将默认传入的Header存入
  if (isObject(option.headers)) {
    for (const key in option.headers) {
      if (Object.prototype.hasOwnProperty.call(option.headers, key)) {
        headers.set(key, option.headers[key]);
      }
    }
  }

  const fetchOption: RequestInit = {
    method: option.method,
    signal: controller.signal,
    headers
  };

  let requestData = option.params;
  let fetchUrl = option.url;
  if (option.paramsSerializer) {
    requestData = option.paramsSerializer(requestData);
  }
  if (requestData) {
    // 表单数据类型需要去除Content-Type
    const isFormPayload = utils.isFormData(requestData);
    if (isFormPayload) {
      if (headers.has("Content-Type")) {
        headers.delete("Content-Type");
      }
    } else if (!headers.has("Content-Type")) {
      // 其他都默认为一般数据类型
      headers.set("Content-Type", "application/json");
    }
    if (option.method === "GET") {
      if (requestData instanceof URLSearchParams) {
        fetchUrl += "?" + requestData.toString();
      } else if (isObject(requestData)) {
        const usp = new URLSearchParams();
        for (const key in requestData as Record<string, any>) {
          if (Object.prototype.hasOwnProperty.call(requestData, key)) {
            const element = (requestData as Record<string, any>)[key];
            if (isObjectLike(element)) {
              usp.set(key, JSON.stringify(element));
            } else {
              usp.set(key, element);
            }
          }
        }
        fetchUrl += "?" + usp.toString();
      } else {
        fetchUrl += "?" + requestData;
      }
    } else {
      if (requestData instanceof URLSearchParams) {
        fetchOption.body = requestData;
      } else if (isFormPayload) {
        fetchOption.body = requestData as FormData;
      } else {
        fetchOption.body = JSON.stringify(requestData);
      }
    }
  }
  return { fetchUrl, fetchOption };
}

const fileReg = /image|audio|video|zip|gzip|rar|tar|xml|pdf|msword|excel|powerpoint/;
function sendFetchAndProcessResponse(
  res: Response,
  contentType?: string | null | undefined
):
  | string
  | Blob
  | ArrayBuffer
  | FormData
  | Record<string, any>
  | ReadableStream<Uint8Array>
  | null {
  if (contentType) {
    if (contentType.includes("json")) {
      return res.json() as Record<string, any>;
    } else if (contentType.includes("text")) {
      return res.text();
    } else if (fileReg.test(contentType)) {
      return res.blob();
    } else if (contentType.includes("form")) {
      return res.formData();
    } else if (contentType === "arraybuffer") {
      return res.arrayBuffer();
    }
  }
  // 逐行处理逻辑参考：
  // https://developer.mozilla.org/zh-CN/docs/Web/API/Fetch_API/Using_Fetch
  return res.body;
}

// 请求输入输出处理中间件
export const processFetchInputAndOutput: API.MiddlewareHandle<API.Context<any>> =
  async function processFetchInputAndOutput(ctx, next) {
    const { options, controller } = ctx.request;
    // ---------------------------- 请求参数准备 ---------------------------------------
    const { fetchUrl, fetchOption } = prepareFetchParams(options, controller);
    // ------------------发送请求---------------------
    try {
      const res = await fetch(fetchUrl, fetchOption);
      if (res.ok) {
        // ------------------发送请求后对数据进行处理---------------------
        let contentType =
          (fetchOption?.headers as Record<string, string> | null)?.["Content-Type"] || null;
        if (!contentType) {
          // 优先使用指定的返回数据类型，不然再从响应类型里面判断
          contentType = options.responseType || res.headers.get("Content-Type");
        }
        ctx.response.result = res;
        ctx.contentType = contentType;
        ctx.response.data = sendFetchAndProcessResponse(res, contentType);
      } else {
        ctx.response.error = res;
      }
    } catch (error) {
      ctx.response.error = error;
    }
    await next();
  };

declare module "../base" {
  interface TOptions<T> {
    /**
     * 请求参数自定义序列化操作(可以截留或修改请求参数)
     * @param params 传入的请求函数
     * @returns 返回实际发出请求使用的参数
     */
    paramsSerializer?: (params: TQueryParams) => TQueryParams;
    /**
     * 指定响应数据类型
     */
    responseType?: XMLHttpRequestResponseType;
  }
}
