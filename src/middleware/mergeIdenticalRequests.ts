import { toHash } from "../utils";

const cacheRequest: Record<string, { resolve: (res: any) => void; reject: (res: any) => void }[] | undefined> = {};
const cacheState: Record<string, boolean> = {};

export const mergeIdenticalRequests: API.MiddlewareHandle<API.Context<any>> = async function mergeIdenticalRequests(ctx, next) {
  const options = ctx.request.options;
  const hash = toHash(options.url, options.params);
  const useMergeIdenticalRequest = options.useMergeIdenticalRequest;
  if (useMergeIdenticalRequest && cacheState[hash]) {
    return new Promise((resolve, reject) => {
      const ch = cacheRequest[hash];
      if (ch) {
        ch.push({ resolve, reject });
      } else {
        cacheRequest[hash] = [{ resolve, reject }];
      }
    });
  }
  // 发请求
  await next();
  // 如果发完请求后需要存储本地缓存，并且请求没报错，请求回来的数据校验没问题
  if (useMergeIdenticalRequest) {
    if (!ctx.response.error) {
      const ch = cacheRequest[hash];
      if (ch) {
        ch.forEach(req => {
          req.resolve(ctx.response.data);
        });
      }
      cacheRequest[hash] = undefined;
    } else {
      const ch = cacheRequest[hash];
      if (ch) {
        ch.forEach(req => {
          req.reject(ctx.response.error);
        });
      }
      cacheRequest[hash] = undefined;
    }
  }
};

declare module "../base" {
  interface TOptions<T> {
    /**
     * 是否使用合并同时发起的相同请求(url和params均相同)，当值为 true 时，同时发起的请求仅会发起一次,其他请求获得相同的返回值
     */
    useMergeIdenticalRequest?: boolean;
  }
}
