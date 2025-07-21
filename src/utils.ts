import md5 from "./md5";

const typeOfTest = (type: string) => (thing: any) => typeof thing === type;

const kindOf = ((cache) => (thing: any) => {
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
  return new Promise<void>((resolve) => {
    setTimeout(async () => {
      resolve();
    }, timeout);
  });
}

// 等待重试（延长等待时间）
export async function loopWait(
  checkBreak: () => boolean,
  loopTimes = 3,
  timeout = 300
) {
  for (let index = 0; index < loopTimes; index++) {
    if (checkBreak()) {
      return "done";
    }
    await waitHandle(timeout);
  }
  return "done";
}

export function toHash(url: string, params: API.QueryParams) {
  let str = url;
  if (params) {
    if (isArrayBufferFn(params)) {
      str += String.fromCharCode.apply(null, new Uint16Array(params) as any);
    } else if (isFormData(params)) {
      const obj = fromPairs([...params.entries()]);
      str += JSON.stringify(obj);
    } else if (isBlob(params)) {
      str += params.text();
    } else if (isObjectLike(params)) {
      str += toStringFn(params);
    }
  }
  return md5.hash(str);
}

export function connectGetParams(fetchUrl: string, data?: string | void) {
  if (!data) return fetchUrl;
  if (fetchUrl.includes("?")) {
    return fetchUrl + "&" + data;
  } else {
    return fetchUrl + "?" + data;
  }
}

export function isUndefined(value: any): value is undefined {
  return value === undefined;
}

export function isObject(value: any): value is object {
  const type = typeof value;
  return value != null && (type === "object" || type === "function");
}
export function isObjectLike(value: any): boolean {
  return value != null && typeof value === "object";
}

function toStringFn(value: any): string {
  return value == null ? "" : baseToString(value);
}

const INFINITY = 1 / 0;

function baseToString(value: any): string {
  if (typeof value === "string") {
    return value; // 字符串直接返回
  }
  if (Array.isArray(value)) {
    return `${value.map(baseToString)}`; // 递归处理数组元素
  }
  if (isSymbol(value)) {
    return value.toString(); // Symbol 调用其 toString()
  }
  const result = `${value}`; // 默认转换为字符串
  return result == "0" && 1 / value == -INFINITY ? "-0" : result; // 特殊处理 -0
}

export function isSymbol(value: any): value is symbol {
  return typeof value === "symbol";
}

function isArrayBufferFn(value: any): value is ArrayBuffer {
  return Object.prototype.toString.call(value) === "[object ArrayBuffer]";
}

/**
 * 将键值对数组转换为对象
 * @example
 * fromPairs([['a', 1], ['b', 2]]) // => { a: 1, b: 2 }
 */
export function fromPairs<K extends PropertyKey, V>(
  pairs: Array<[K, V]>
): Record<K, V>;

/**
 * 处理带额外属性的键值对数组（第三个元素起会被忽略）
 * @example
 * fromPairs([['a', 1, true], ['b', 2, false]]) // => { a: 1, b: 2 }
 */
export function fromPairs<K extends PropertyKey, V, Extra>(
  pairs: Array<[K, V, ...Extra[]]>
): Record<K, V>;

export function fromPairs(pairs: any[] | null | undefined): Record<string, any> {
  const result: Record<string, any> = {};

  if (!pairs) {
    return result;
  }

  for (const pair of pairs) {
    if (Array.isArray(pair) && pair.length >= 2) {
      result[pair[0]] = pair[1];
    }
  }

  return result;
}
