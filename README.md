## 基于洋葱模型的请求模块

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

Middleware是洋葱圈的结构，在初始化（new Middleware）传入，参数数组先后顺序是洋葱从外到内的结构
而如果是通过`middleware.add(function)`的方式添加，那么后添加的相当于对当前增加包裹层(即添加在数组最前面unshift)

### 项目中默认提供了3个中间件：
1. `processCache`后续发起相同请求会直接使用缓存数据
3. `mergeIdenticalRequests`同时发起相同请求只会发起一个，返回相同结果
2. `processFetchInputAndOutput`用于发送请求

中间件的顺序有严格的使用顺序限制，在使用中必须严格校验顺序带的问题

### 洋葱圈结构执行示例：
```javascript
function A(ctx, next) {
  console.log(1);
  next()
  if (state) {
    console.log(7);
    next(true);
    console.log(8);
  }
  console.log(2);
}
function B(ctx, next) {
  console.log(3);
  next()
  console.log(4);
}
function C(ctx, next) {
  console.log(5);
  next()
  console.log(6);
}
const middleware = new Middleware([A, B, C]);
```

上面代码执行结果：
1. state=false，执行效果默认应该是： 1 -> 3 -> 5 -> 6 -> 4 -> 2
2. state=true，此时结果是：1 -> 3 -> 5 -> 6 -> 4 -> 7 -> 3 -> 5 -> 6 -> 4 -> 8 -> 2

