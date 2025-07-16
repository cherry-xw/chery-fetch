import { toHash } from "../utils";

const cacheRequest: Record<
  string,
  { ctx: any; resolve: () => void; reject: () => void }[] | undefined
> = {};
const cacheState: Record<string, boolean> = {};

const mergeDuplicateRequests: API.MiddlewareHandle<API.Context<any>> =
  async function mergeDuplicateRequests(ctx, next) {
    const options = ctx.request.options;
    const hash = toHash(options.url, options.params);
    const useMergeIdenticalRequest = options.useMergeIdenticalRequest;
    if (useMergeIdenticalRequest && cacheState[hash]) {
      return new Promise((resolve, reject) => {
        const ch = cacheRequest[hash];
        if (ch) {
          ch.push({ resolve, reject, ctx });
        } else {
          cacheRequest[hash] = [{ resolve, reject, ctx }];
        }
      });
    }
    cacheState[hash] = true;
    // 发请求
    await next();
    // 如果发完请求后需要存储本地缓存，并且请求没报错，请求回来的数据校验没问题
    if (useMergeIdenticalRequest) {
      if (!ctx.response.error) {
        const ch = cacheRequest[hash];
        if (ch) {
          ch.forEach((req) => {
            req.ctx.response = ctx.response;
            req.resolve();
          });
        }
      } else {
        const ch = cacheRequest[hash];
        if (ch) {
          ch.forEach((req) => {
            req.ctx.response = ctx.response;
            req.reject();
          });
        }
      }
      cacheRequest[hash] = undefined;
    }
    cacheState[hash] = false;
  };

export default mergeDuplicateRequests;
declare module "../base" {
  interface TOptions<T> {
    /**
     * 是否使用合并同时发起的相同请求(url和params均相同)，当值为 true 时，同时发起的请求仅会发起一次,其他请求获得相同的返回值
     */
    useMergeIdenticalRequest?: boolean;
  }
}
