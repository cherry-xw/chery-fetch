import * as utils from "../utils";

function prepareFetchParams<T = any>(
  option: API.Options<T>,
  controller: AbortController
) {
  // 声明header实例
  const headers = new Headers();
  // 先将默认传入的Header存入
  if (utils.isObject(option.headers)) {
    for (const key in option.headers) {
      if (Object.prototype.hasOwnProperty.call(option.headers, key)) {
        headers.set(key, option.headers[key]);
      }
    }
  }

  const fetchOption: RequestInit = {
    method: option.method,
    signal: controller.signal,
    headers,
  };
  if (option.cache) {
    fetchOption.cache = option.cache;
  }
  if (option.credentials) {
    fetchOption.credentials = option.credentials;
  }
  if (option.integrity) {
    fetchOption.integrity = option.integrity;
  }
  if (option.keepalive) {
    fetchOption.keepalive = option.keepalive;
  }
  if (option.mode) {
    fetchOption.mode = option.mode;
  }
  if (option.priority) {
    fetchOption.priority = option.priority;
  }
  if (option.redirect) {
    fetchOption.redirect = option.redirect;
  }
  if (option.referrer) {
    fetchOption.referrer = option.referrer;
  }
  if (option.referrerPolicy) {
    fetchOption.referrerPolicy = option.referrerPolicy;
  }

  let requestData = option.params;
  let fetchUrl = option.url;
  if (option.paramsSerializer) {
    requestData = option.paramsSerializer(requestData, option);
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
        fetchUrl = utils.connectGetParams(fetchUrl, requestData.toString());
      } else if (utils.isObject(requestData)) {
        const usp = new URLSearchParams();
        for (const key in requestData as Record<string, any>) {
          if (Object.prototype.hasOwnProperty.call(requestData, key)) {
            const element = (requestData as Record<string, any>)[key];
            if (utils.isObjectLike(element)) {
              usp.set(key, JSON.stringify(element));
            } else {
              usp.set(key, element);
            }
          }
        }
        fetchUrl = utils.connectGetParams(fetchUrl, usp.toString());
      } else {
        fetchUrl = utils.connectGetParams(fetchUrl, requestData);
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

const fileReg =
  /image|audio|video|zip|gzip|rar|tar|xml|pdf|msword|excel|powerpoint|blob/;
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
const processFetchInputAndOutput: API.MiddlewareHandle<API.Context<any>> =
  async function processFetchInputAndOutput(ctx, next) {
    const { options, controller } = ctx.request;
    // ---------------------------- 请求参数准备 ---------------------------------------
    const { fetchUrl, fetchOption } = prepareFetchParams(options, controller);
    // ------------------发送请求---------------------
    let timeoutId: any;
    try {
      if (options.timeout && options.timeout > 0) {
        timeoutId = setTimeout(() => {
          timeoutId = null;
          controller.abort("request timeout");
        }, options.timeout);
      }
      const res = await fetch(fetchUrl, fetchOption);
      if (timeoutId) clearTimeout(timeoutId);
      if (res.ok) {
        // ------------------发送请求后对数据进行处理---------------------
        let contentType =
          (fetchOption?.headers as Record<string, string> | null)?.[
            "Content-Type"
          ] || null;
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
      if (timeoutId) clearTimeout(timeoutId);
      ctx.response.error = error;
    }
    await next();
  };

export default processFetchInputAndOutput;
declare module "../base" {
  interface TOptions<T> {
    /**
     * 请求参数自定义序列化操作(可以截留或修改请求参数)
     * @param params 传入的请求参数
     * @param options 传入的所有请求配置
     * @returns 返回实际发出请求使用的参数
     */
    paramsSerializer?: (
      params: TQueryParams,
      options: TOptions<T>
    ) => TQueryParams;
    /**
     * 指定响应数据类型
     */
    responseType?: XMLHttpRequestResponseType;
    /**
     * 请求超时时间，为空或为0（小于0）表示不会超时
     * 注意，这个超时是从发出请求开始计算的，如果中途阻断(abort)后再重新发起请求，则重新计算
     * @default 0
     */
    timeout?: number;
  }
}
