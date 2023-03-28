const typeOfTest = (type: string) => (thing: any) => typeof thing === type;

const kindOf = (cache => (thing: any) => {
  const str = toString.call(thing);
  return cache[str] || (cache[str] = str.slice(8, -1).toLowerCase());
})(Object.create(null));

const kindOfTest = <T>(type: string) => {
  type = type.toLowerCase();
  return (thing: any): thing is T => kindOf(thing) === type;
};

const isFunction = typeOfTest("function");

export const isArrayBuffer = kindOfTest("ArrayBuffer");
export const isBlob = kindOfTest<Blob>("Blob");

const pattern = "[object FormData]";
export function isFormData(requestData: any): requestData is FormData {
  return (
    requestData &&
    ((typeof FormData === "function" && requestData instanceof FormData) ||
      toString.call(requestData) === pattern ||
      (isFunction(requestData.toString) && requestData.toString() === pattern))
  );
}

// 等待
export function waitHandle(timeout = 300) {
  return new Promise<void>(resolve => {
    setTimeout(async () => {
      resolve();
    }, timeout);
  });
}

// 等待重试（延长等待时间）
export async function loopWait(checkBreak: () => boolean, loopTimes = 3, timeout = 300) {
  for (let index = 0; index < loopTimes; index++) {
    if (checkBreak()) {
      return "done";
    }
    await waitHandle(timeout);
  }
  return "done";
}
