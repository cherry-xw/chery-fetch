import { fromPairs, isArrayBuffer, isObjectLike, toString } from "lodash";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import md5 from "js-md5";
import * as utils from "../utils";

function toHash(url: string, params: API.QueryParams) {
  let str = url;
  if (params) {
    if (isArrayBuffer(params)) {
      str += String.fromCharCode.apply(null, new Uint16Array(params) as any);
    } else if (utils.isFormData(params)) {
      const obj = fromPairs([...params.entries()]);
      str += JSON.stringify(obj);
    } else if (utils.isBlob(params)) {
      str += params.text();
    } else if (isObjectLike(params)) {
      str += toString(params);
    }
  }
  return md5(str);
}

const cache: Record<string, { data: any; time: number }> = {};
// 过期时间 30min
// const EXPIRATION = 1800000;
// TODO 过期逻辑
// 缓存处理中间件
export const processCache: API.MiddlewareHandle<API.Context<any>> = async function processCache(ctx, next) {
  const options = ctx.request.options;
  const hash = toHash(options.url, options.params);
  // 使用本地缓存，并且本地有缓存则取出缓存后直接返回
  if (options.useLocalCache) {
    const cacheObj = cache[hash];
    if (cacheObj && cacheObj.time) {
      ctx.response.data = cacheObj.data;
      return;
    }
  }
  // 发请求
  await next();
  // 如果发完请求后需要存储本地缓存，并且请求没报错，请求回来的数据校验没问题
  if (options.useLocalCache && !ctx.response.error) {
    const checkH = ctx.request.options.checkResultToCache || (data => true);
    if (checkH(ctx.response.data)) {
      cache[hash] = {
        data: ctx.response.data,
        time: Date.now()
      };
    }
  }
};
