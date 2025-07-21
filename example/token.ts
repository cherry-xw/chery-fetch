/**
 * 请求无感刷新token封装
 */

import "..";
import { core, Middleware, ServeCreator } from "..";

// 存储token
let accessToken = localStorage.getItem("accessToken");
let refreshToken = localStorage.getItem("refreshToken");

// token刷新服务
const tokenServe = ServeCreator("", "POST");
// token刷新请求函数，如果同时发起多个相同请求合并只发一个请求
const refresh = tokenServe<{
  data: { accessToken: string; refreshToken: string };
}>("/refreshToken", { refreshToken }, { useMergeIdenticalRequest: true });

// token刷新中间件
// 定义一个token刷新中间件
const tokenRefreshMiddleware: API.MiddlewareHandle<API.Context<any>> =
  async function (ctx, next) {
    // 如果token不存在，则直接返回
    if (!accessToken || !refreshToken) {
      ctx.response.error = "token is not exist";
      return;
    }
    // 如果请求头不存在，则创建一个空对象
    if (!ctx.request.options.headers) {
      ctx.request.options.headers = {};
    }
    // 将token添加到请求头中
    ctx.request.options.headers["Authorization"] = `Bearer ${accessToken}`;

    // 执行下一个中间件
    await next();

    // 如果响应状态码为401，则说明token过期，需要刷新token
    if (ctx.response.result?.status === 401) {
      try {
        // 调用刷新token的promise
        const res = await refresh.promise();
        // 如果刷新成功，则更新token并重新执行下一个中间件
        if (res.status === 200) {
          accessToken = res.data.accessToken;
          refreshToken = res.data.refreshToken;
          localStorage.setItem("accessToken", accessToken);
          localStorage.setItem("refreshToken", refreshToken);
          // 刷新token成功重新发起前面的请求，重新执行当前中间件
          await next(true);
        } else {
          ctx.response.error = "token refresh failed";
        }
      } catch (error) {
        ctx.response.error = "token refresh failed";
        console.warn(error);
      }
    }
  };

const middleware = new Middleware([tokenRefreshMiddleware, core]);

export const withTokenServe = ServeCreator("http://localhost:3000", "POST", {
  middleware,
});
