// nanoid.ts
type RandomFunction = (bytes: number) => Uint8Array;

// 默认字母表（URL友好）
const urlAlphabet =
  "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";

// 浏览器和Node.js的安全随机生成器
const random: RandomFunction = (bytes: number) => {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return arr;
};

/**
 * 生成一个随机的NanoID
 * @param size ID的长度，默认为21
 * @param alphabet 自定义字母表
 * @returns 生成的NanoID
 */
export function nanoid(
  size: number = 21,
  alphabet: string = urlAlphabet
): string {
  if (size <= 0) {
    throw new Error("Size must be greater than 0");
  }

  const len = alphabet.length;
  if (len === 0 || len > 256) {
    throw new Error("Alphabet must contain between 1 and 256 characters");
  }

  // 为了均匀分布，我们使用 rejection sampling 算法
  const step = Math.ceil((1.6 * size * len) / 256);

  let id = "";
  while (true) {
    const bytes = random(step);
    for (let i = 0; i < step; i++) {
      const charIndex = bytes[i] % len;
      id += alphabet[charIndex];
      if (id.length === size) {
        return id;
      }
    }
  }
}

/**
 * 自定义字母表的NanoID生成器
 * @param alphabet 自定义字母表
 * @param defaultSize 默认大小
 * @returns 生成器函数
 */
export function customAlphabet(
  alphabet: string,
  defaultSize: number = 21
): () => string {
  return () => nanoid(defaultSize, alphabet);
}

/**
 * 生成非安全随机ID（仅用于测试或非关键场景）
 * @param size ID的长度，默认为21
 * @param alphabet 自定义字母表
 * @returns 生成的NanoID
 */
export function unsafeNanoid(
  size: number = 21,
  alphabet: string = urlAlphabet
): string {
  let id = "";
  for (let i = 0; i < size; i++) {
    id += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return id;
}

// 常用字母表
export const alphabets = {
  numbers: "0123456789",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  alphanumeric:
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  hex: "0123456789abcdef",
  url: urlAlphabet,
};
