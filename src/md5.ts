type WordArray = number[];

export default class MD5 {
  private static readonly HEX_CHARS = "0123456789abcdef";
  private static readonly BLOCK_SIZE = 64; // 512 bits = 64 bytes

  // MD5 初始向量 (magic numbers)
  private static readonly INIT_STATE: WordArray = [
    0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476,
  ];

  // 常量表
  private static readonly SINE_TABLE: number[] = [
  0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee,
  0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501,
  0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be,
  0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821,
  0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa,
  0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
  0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed,
  0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a,
  0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c,
  0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70,
  0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05,
  0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
  0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039,
  0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
  0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1,
  0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391
];

  /**
   * 计算字符串的 MD5 哈希值
   * @param message 输入字符串
   * @returns 16进制表示的MD5哈希值
   */
  public static hash(message: string): string {
    // 转换为UTF-8字节数组
    const bytes = MD5.stringToUtf8Bytes(message);
    // 处理消息块
    const hash = MD5.bytesToHash(bytes);
    // 转换为16进制字符串
    return MD5.wordsToHex(hash);
  }

  /**
   * 将字符串转换为UTF-8字节数组
   */
  private static stringToUtf8Bytes(str: string): number[] {
    const bytes: number[] = [];
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if (code < 0x80) {
        bytes.push(code);
      } else if (code < 0x800) {
        bytes.push(0xc0 | (code >> 6));
        bytes.push(0x80 | (code & 0x3f));
      } else if (code < 0x10000) {
        bytes.push(0xe0 | (code >> 12));
        bytes.push(0x80 | ((code >> 6) & 0x3f));
        bytes.push(0x80 | (code & 0x3f));
      } else {
        bytes.push(0xf0 | (code >> 18));
        bytes.push(0x80 | ((code >> 12) & 0x3f));
        bytes.push(0x80 | ((code >> 6) & 0x3f));
        bytes.push(0x80 | (code & 0x3f));
      }
    }
    return bytes;
  }

  /**
   * 对字节数组进行MD5处理
   */
  private static bytesToHash(bytes: number[]): WordArray {
    // 消息填充
    const blocks = MD5.padMessage(bytes);
    // 初始化哈希状态
    let state = [...MD5.INIT_STATE];

    // 处理每个512位块
    for (let i = 0; i < blocks.length; i += 16) {
      const block = blocks.slice(i, i + 16);
      MD5.processBlock(state, block);
    }

    return state;
  }

  /**
   * 消息填充 (填充到512位的倍数)
   */
  private static padMessage(bytes: number[]): WordArray {
    const bitLength = bytes.length * 8;
    const blocks: WordArray = [];

    // 转换为32位字数组 (小端序)
    for (let i = 0; i < bytes.length; i += 4) {
      blocks.push(
        (bytes[i] |
          (bytes[i + 1] << 8) |
          (bytes[i + 2] << 16) |
          (bytes[i + 3] << 24)) >>>
          0
      );
    }

    // 添加填充位 '1' + '0's
    const paddingByte = 0x80;
    blocks.push(paddingByte << ((bytes.length % 4) * 8));

    // 确保有空间存放原始长度 (64位)
    const paddingLength =
      blocks.length % 16 < 14
        ? 14 - (blocks.length % 16)
        : 30 - (blocks.length % 16);
    for (let i = 0; i < paddingLength; i++) {
      blocks.push(0);
    }

    // 添加原始位长度 (小端序，64位)
    blocks.push(bitLength >>> 0);
    blocks.push((bitLength / 0x100000000) >>> 0);

    return blocks;
  }

  /**
   * 处理一个512位块
   */
  private static processBlock(state: WordArray, block: WordArray): void {
    let [a, b, c, d] = state;
    const x = new Array(16);

    // 将块转换为小端序
    for (let i = 0; i < 16; i++) {
      x[i] = block[i];
    }

    // 四轮主循环
    // 第一轮
    for (let i = 0; i < 16; i++) {
      const f = (b & c) | (~b & d);
      const g = i;
      a = MD5.round(
        f,
        a,
        b,
        c,
        d,
        x[g],
        MD5.SINE_TABLE[i],
        [7, 12, 17, 22][i % 4]
      );
      [a, b, c, d] = [d, a, b, c];
    }

    // 第二轮
    for (let i = 16; i < 32; i++) {
      const f = (d & b) | (~d & c);
      const g = (5 * i + 1) % 16;
      a = MD5.round(
        f,
        a,
        b,
        c,
        d,
        x[g],
        MD5.SINE_TABLE[i],
        [5, 9, 14, 20][i % 4]
      );
      [a, b, c, d] = [d, a, b, c];
    }

    // 第三轮
    for (let i = 32; i < 48; i++) {
      const f = b ^ c ^ d;
      const g = (3 * i + 5) % 16;
      a = MD5.round(
        f,
        a,
        b,
        c,
        d,
        x[g],
        MD5.SINE_TABLE[i],
        [4, 11, 16, 23][i % 4]
      );
      [a, b, c, d] = [d, a, b, c];
    }

    // 第四轮
    for (let i = 48; i < 64; i++) {
      const f = c ^ (b | ~d);
      const g = (7 * i) % 16;
      a = MD5.round(
        f,
        a,
        b,
        c,
        d,
        x[g],
        MD5.SINE_TABLE[i],
        [6, 10, 15, 21][i % 4]
      );
      [a, b, c, d] = [d, a, b, c];
    }

    // 更新状态
    state[0] = (state[0] + a) >>> 0;
    state[1] = (state[1] + b) >>> 0;
    state[2] = (state[2] + c) >>> 0;
    state[3] = (state[3] + d) >>> 0;
  }

  /**
   * 单轮处理函数
   */
  private static round(
    func: number,
    a: number,
    b: number,
    c: number,
    d: number,
    x: number,
    sine: number,
    shift: number
  ): number {
    return b + MD5.rotateLeft((a + func + x + sine) >>> 0, shift);
  }

  /**
   * 循环左移
   */
  private static rotateLeft(value: number, shift: number): number {
    return (value << shift) | (value >>> (32 - shift));
  }

  /**
   * 将32位字数组转换为16进制字符串
   */
  private static wordsToHex(words: WordArray): string {
    let hex = "";
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      for (let j = 0; j < 4; j++) {
        const byte = (word >>> (j * 8)) & 0xff;
        hex +=
          MD5.HEX_CHARS.charAt((byte >>> 4) & 0x0f) +
          MD5.HEX_CHARS.charAt(byte & 0x0f);
      }
    }
    return hex;
  }
}
