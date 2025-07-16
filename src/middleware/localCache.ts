import { toHash } from "../utils";

const cache: Record<string, { data: any; time: number; cacheExpiration: number }> = {};
// 过期时间 30min
const EXPIRATION = 1800000;
// TODO 过期逻辑
// 缓存处理中间件
const processCache: API.MiddlewareHandle<API.Context<any>> = async function processCache(
  ctx,
  next
) {
  const options = ctx.request.options;
  let hash = "";
  if (options.useLocalCache || options.addLocalCache) hash = toHash(options.url, options.params);
  // 使用本地缓存，并且本地有缓存则取出缓存后直接返回
  if (options.useLocalCache) {
    const cacheObj = cache[hash];
    if (cacheObj && Date.now() - cacheObj.time < cacheObj.cacheExpiration) {
      ctx.response.data = cacheObj.data;
      return;
    }
  }
  // 发请求
  await next();
  // 如果发完请求后需要存储本地缓存，并且请求没报错，请求回来的数据校验没问题
  if ((options.useLocalCache || options.addLocalCache) && !ctx.response.error) {
    const checkH = options.checkResultToCache || (() => true);
    if (checkH(ctx.request.options, ctx.response.data)) {
      cache[hash] = {
        data: await ctx.response.data,
        time: Date.now(),
        cacheExpiration: options.cacheExpiration || EXPIRATION
      };
    }
  }
};

export default processCache;
declare module "../base" {
  // eslint-disable-next-line no-unused-vars
  interface TOptions<T> {
    /**
     * 是否使用本地缓存，当值为 true 时，GET 请求在 ttl 毫秒内将被缓存，缓存策略唯一 key 为 url + params + method 组合
     * 缓存会增加内存资源消耗，但是可以消除多次重复请求
     */
    useLocalCache?: boolean;
    /**
     * 检查是否会将数据缓存到本地，仅在useLocalCache为true时会触发调用
     * @param response 被检查response数据
     * @returns true表示数据需要缓存，false表示数据不需要被缓存
     */
    checkResultToCache?: (options: TOptions<T>, response: T) => boolean;
    /**
     * 本地缓存过期时间，单位毫秒，默认30min
     */
    cacheExpiration?: number;
    /**
     * 是否将数据缓存到本地，该操作仅会存储值，每次请求都会存
     */
    addLocalCache?: boolean;
  }
}
