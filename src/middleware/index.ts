import compose from "./compose";

/**
 * 后添加的先执行
 * new Middleware 入参数组顺序与add函数相反
 */
export default class Middleware<Ctx> {
  // 存储中间件的列表
  private __events__: API.MiddlewareHandle<Ctx>[] = [];
  constructor(handles?: API.MiddlewareHandle<Ctx>[]) {
    if (handles) {
      this.__events__ = handles.slice();
    }
  }
  /**
   * 新加的中间件放前面，在外层形成调用包裹层，先进先开始最后结束
   * @param handle 中间件处理函数
   */
  add(handle: API.MiddlewareHandle<Ctx>) {
    this.__events__.unshift(handle);
    return this;
  }
  /**
   * 执行中间件
   * @param ctx 上下文
   * @param eachMiddlewareInject 在每个中间件注入逻辑
   */
  exec(ctx: Ctx, eachMiddlewareInject?: (ctx: Ctx, state: "enter" | "exit", functionName?: string) => void) {
    return compose<Ctx>(this.__events__)(ctx, eachMiddlewareInject);
  }
  /**
   * 用于继承其他地方定义的中间件
   * @param instance 其他中间件实例
   */
  extend(instance: Middleware<Ctx>) {
    this.__events__ = instance.events;
    return this;
  }
  /**
   * 当前中间件列表
   */
  get events() {
    return this.__events__.slice();
  }
  /**
   * 用于将当前对象生成新实例
   */
  clone<T extends Ctx>() {
    return new Middleware<T>(this.__events__);
  }
}
