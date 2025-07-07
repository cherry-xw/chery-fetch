import {
  Middleware,
  processCache,
  ServeCreator,
  processFetchInputAndOutput,
} from "chery-fetch";

const serve = ServeCreator("https://www.xcherry.top/api"); // 创建请求实例
const request = serve("/user/login", { username: "", password: "" }); // 发送请求
const res1 = request.sync; // 发送请求
const res2 = request.promise(); // 发送请求
request.abort(); // 取消请求
request.loading; // 请求loading状态，在获取时得到最新状态
request.loadingRef; // 请求loading状态，在获取时得到最新状态，ref类型

// 修改请求头，修改默认中间件
const middleware = new Middleware([
  // ohter custom middleware
  processCache,
  processFetchInputAndOutput,
]);
const serve1 = ServeCreator("https://www.xcherry.top/api", {
  headers: {
    "Content-Type": "application/json",
  },
  middleware,
});

// 在上面请求基础上添加默认请求Method，默认值为GET
const serve2 = ServeCreator("https://www.xcherry.top/api", "POST", {
  headers: {
    "Content-Type": "application/json",
  },
  middleware,
});
// 当然，默认值会被覆盖，每个状态都有可省略写法
const res3 = await serve2(
  "/user/login",
  "GET",
  { username: "", password: "" },
  {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  }
).sync;

// 中间件额外操作使用

// processCache 使用示例
const res = serve(
  "/user/login",
  { username: "", password: "" },
  {
    useLocalCache: true, // 是否使用本地缓存，默认false
    cacheExpiration: 10, // 设置缓存过期时间,默认30分钟
    // 在开启useLocalCache后，具体判断是否将结果存入缓存，该配置默认为: () => true
    // options: 请求参数
    // response: 请求结果
    checkResultToCache(options, response) {
      // 根据返回值控制是否缓存
      return true;
    },
    useMergeIdenticalRequest: true, // 是否合并相同请求，默认为false
  }
).sync;

// 自定义中间件开发示例

function getToken() {
  return "new token";
}
// 这个请求不能使用serve的实例，否则容易发生混乱
// 可以为这个请求单独创建一个ServeCreator实例
// 同时，为了防止在同时发起多个刷新token的请求，使用useMergeIdenticalRequest配置避免重复请求
async function refreshToken() {
  return "new token";
}
// 检查token是否过期并自动重新获取
const checkToken: API.MiddlewareHandle<API.Context<any>> =
  async function checkToken(ctx, next) {
    if (ctx.request.options.useToken) {
      const token = getToken();
      ctx.request.headers["Authorization"] = `Bearer ${token}`;
    }
    // 先执行后续中间件
    await next();
    if (ctx.request.options.useToken) {
      // 检查token是否过期
      if (ctx.response.data && ctx.response.data.code === 401) {
        // token过期，重新获取token
        const token = await refreshToken();
        ctx.request.headers["Authorization"] = `Bearer ${token}`;
        await next(true); // 重新发起请求，这个逻辑详见：README.md中最后关于中间件执行说明
      }
    }
  };

// 扩展使用token检查的请求
declare module "chery-fetch/src/base" {
  interface TOptions<T> {
    useToken?: boolean;
  }
}
// 创建一个使用token检查的Middleware实例
const middleware1 = new Middleware([
  checkToken,
  processCache,
  processFetchInputAndOutput,
]);
// 挂载中间件
const serve3 = ServeCreator("https://www.xcherry.top/api", {
  middleware: middleware1,
});
