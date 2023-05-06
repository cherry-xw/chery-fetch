## 基于洋葱模型开发

代码逻辑基于koaJS

> authority xchery

### 基本使用示例
```javascript
const serve = ServeCreator("https://www.xcherry.top/api");
const request = serve("/user/login"， { username: "", password: "" })
```
其中`ServeCreator`以及`serve`均有多种重载以适配各种入参


本项目核心功能是使用`middleware`来实现层的控制

### middleware使用示例
```javascript
const middleware = new Middleware([
  processCache,
  processFetchInputAndOutput
]);
export const serve = ServeCreator("https://www.xcherry.top/api", "POST", {
  middleware,
  headers: { authority: "xxx" }
});
```
Middleware是洋葱圈的结构，这里有一个注意的点如果是在初始化时传入数组，数组的前后顺序是洋葱从外到内的结构
而如果是通过`middleware.add(function)`的方式添加，那么后添加的相当于对当前增加包裹层(即添加在数组最前面unshift)

### 项目中默认提供了3个中间件：
1. `processCache`后续发起相同请求会直接使用缓存数据
3. `mergeIdenticalRequests`同时发起相同请求只会发起一个，返回相同结果
2. `processFetchInputAndOutput`用于发送请求

中间件的顺序有严格的使用顺序限制，在使用中必须严格校验顺序带的问题