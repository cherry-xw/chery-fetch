# chery-fetch

## 基于洋葱模型的请求模块

代码逻辑基于`koa.js`的`compose`核心函数实现

> authority `xchery`
> 完整使用示例在`example`文件夹中

### 基本使用示例

```javascript
const serve = ServeCreator("https://www.xcherry.top/api");
const request = serve("/user/login", { username: "", password: "" })
```

具体使用参考：[示例代码](./example/index.ts)

## 其中`ServeCreator`以及`serve`均有多种重载以适配各种入参

### ServeCreator重载

```javascript
// ServeCreator包含多种入参
// 包装函数重载
/**
 * 注册服务（注册请求前缀，注入内置参数）
 * @param prefixURL 服务器url部分
 */
export function ServeCreator<T = any>(prefixURL: string): RequestOverload<T>;
/**
 * 注册服务（注册请求前缀，注入内置参数）
 * @param prefixURL 服务器url部分
 * @param method 配置默认请求类型
 * @param config 配置默认参数(可选)
 */
export function ServeCreator<T = any>(prefixURL: string, method: API.Method, config?: TConfig$1<T>): RequestOverload<T>;
/**
 * 注册服务（注册请求前缀，注入内置参数）
 * @param prefixURL 服务器url部分
 * @param config 配置默认参数
 * @returns promise返回值
 */
export function ServeCreator<T = any>(prefixURL: string, config: TConfig$1<T>): RequestOverload<T>;
```

本项目核心功能是使用`middleware`来实现层的控制

### middleware基本使用

```javascript
const middleware = new Middleware([
  processCache,
  core
]);
export const serve = ServeCreator("https://www.xcherry.top/api", "POST", {
  middleware
});
```

`Middleware`是洋葱圈的结构，在初始化`（new Middleware）`传入，参数数组先后顺序是洋葱从外到内的顺序，即洋葱圈从外到内包裹的顺序

而如果是通过`middleware.add(function)`的方式添加，那么后添加的相当于对当前增加包裹层(即添加在数组最前面)

另外，`middleware`实例还提供了`clone`方法，用于复制当前实例，方便扩展使用

### 项目中默认提供了3个中间件

1. `processCache`后续发起相同请求会直接使用缓存数据
2. `mergeDuplicateRequests`同时发起相同请求只会发起一个，返回相同结果
3. `core`用于发送请求，格式化fetch入参和出参，一般这个总是处于中间件的最后一个（洋葱最中间）

### 中间件配置介绍

#### `core`配置介绍

```javascript
type CoreConfig = {
    /**
     * 请求参数自定义序列化操作(可以截留或修改请求参数)
     * @param params 传入的请求参数
     * @param options 传入的所有请求配置
     * @returns 返回实际发出请求使用的参数
     */
    paramsSerializer?: (params: TQueryParams, options: Options<T>) => TQueryParams;
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
```

#### `processCache`配置介绍

```javascript
type ProcessCacheConfig = {
    /**
   * 是否使用本地缓存，当值为 true 时，GET 请求在 ttl 毫秒内将被缓存，缓存策略唯一 key 为 url + params + method 组合
   * 缓存会增加内存资源消耗，但是可以消除多次重复请求
   */
  useLocalCache?: boolean;
  /**
   * 设置缓存过期时间,默认30分钟
   */
  cacheExpiration?: number;
  /**
   * 检查是否会将数据缓存到本地，仅在useLocalCache为true时会触发调用
   * @param data 被检查response数据
   * @returns true表示数据需要缓存，false表示数据不需要被缓存
   */
  checkResultToCache?: (data: T) => boolean;
}
```

#### `mergeDuplicateRequests`配置介绍

```javascript
type MergeIdenticalRequestsConfig = {
  /**
   * 是否使用合并同时发起的相同请求(url和params均相同)，当值为 true 时，同时发起的请求仅会发起一次,其他请求获得相同的返回值
   */
  useMergeIdenticalRequest?: boolean;
}
```

具体中间件使用参考：[中间件使用](./example/index.ts)

### 洋葱圈结构执行示例

> 中间件的顺序有严格的使用顺序限制，在使用中必须严格校验顺序带的问题

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

上面代码执行：

1. `state=false`执行结果： 1 -> 3 -> 5 -> 6 -> 4 -> 2
2. `state=true` 执行结果：1 -> 3 -> 5 -> 6 -> 4 -> 7 -> 3 -> 5 -> 6 -> 4 -> 8 -> 2
