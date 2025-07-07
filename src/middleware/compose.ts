export default function compose<Context>(middleware: API.MiddlewareHandle<Context>[]) {
  return async function (
    context: Context,
    eachMiddlewareInject?: (ctx: Context, state: "enter" | "exit", functionName?: string) => void
  ) {
    let index = -1;
    async function dispatch(idx: number, resetIndex?: boolean): Promise<void> {
      // 这里是一个补丁逻辑，如果随意是使用，可能会导致出现死循环问题
      // 这个操作将next结束判断打断了，同时将next步骤撤回了早先的状态，如下注释伪代码所示
      if (resetIndex && idx) {
        index = --idx - 1;
      }
      // 假如没有递增，则说明回调中next执行了多次
      if (idx <= index) {
        throw new Error("next() call multiple times");
      }
      index = idx;
      const fn: Function = middleware[idx];
      if (!fn) return;
      // 每个中间件开始执行前
      if (eachMiddlewareInject) eachMiddlewareInject(context, "enter", fn.name);
      // 执行中间件，中间件的传参，第一个是上下文，第二个是 next 函数
      // 也就是说执行 next 也就是调用 dispatch 函数
      await fn(context, dispatch.bind(null, idx + 1));
      // 每个中间件完成执行后
      if (eachMiddlewareInject) eachMiddlewareInject(context, "exit", fn.name);
    }
    await dispatch(0);
  };
}

// function A(ctx, next) {
//   console.log(1);
//   next()
//   if (state) {
//     console.log(7);
//     next(true);
//     console.log(8);
//   }
//   console.log(2);
// }

// function B(ctx, next) {
//   console.log(3);
//   next()
//   console.log(4);
// }

// function C(ctx, next) {
//   console.log(5);
//   next()
//   console.log(6);
// }
// middleware list = [A, B, C];
// 如果state=false，执行效果默认应该是： 1 -> 3 -> 5 -> 6 -> 4 -> 2
// 如果state=true，此时结果是：1 -> 3 -> 5 -> 6 -> 4 -> 7 -> 3 -> 5 -> 6 -> 4 -> 8 -> 2
