type QrMatrix = boolean[][];

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const toUtf8Bytes = (s: string): number[] => {
  const enc = new TextEncoder();
  return Array.from(enc.encode(s));
};

const gfMul = (x: number, y: number): number => {
  let r = 0;
  for (let i = 0; i < 8; i++) {
    if (y & 1) r ^= x;
    const hi = x & 0x80;
    x = (x << 1) & 0xff;
    if (hi) x ^= 0x1d;
    y >>= 1;
  }
  return r;
};

const rsGeneratorPoly = (degree: number): number[] => {
  let poly = [1];
  let root = 1;
  for (let i = 0; i < degree; i++) {
    const next: number[] = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gfMul(poly[j], root);
      next[j + 1] ^= poly[j];
    }
    poly = next;
    root = gfMul(root, 2);
  }
  return poly;
};

const rsComputeRemainder = (data: number[], ecDegree: number): number[] => {
  const gen = rsGeneratorPoly(ecDegree);
  const msg = data.concat(new Array(ecDegree).fill(0));
  for (let i = 0; i < data.length; i++) {
    const coef = msg[i];
    if (coef === 0) continue;
    for (let j = 0; j < gen.length; j++) {
      msg[i + j] ^= gfMul(gen[j], coef);
    }
  }
  return msg.slice(msg.length - ecDegree);
};

const bitPush = (bits: number[], value: number, length: number) => {
  for (let i = length - 1; i >= 0; i--) {
    bits.push((value >> i) & 1);
  }
};

const bitsToBytes = (bits: number[]): number[] => {
  const out: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) {
      b = (b << 1) | (bits[i + j] ?? 0);
    }
    out.push(b);
  }
  return out;
};

const drawFinder = (m: (number | null)[][], r: number, c: number) => {
  for (let dr = -1; dr <= 7; dr++) {
    for (let dc = -1; dc <= 7; dc++) {
      const rr = r + dr;
      const cc = c + dc;
      if (rr < 0 || rr >= m.length || cc < 0 || cc >= m.length) continue;
      const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
      const inInner = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
      const isDark = inOuter && (dr === 0 || dr === 6 || dc === 0 || dc === 6 || inInner);
      m[rr][cc] = isDark ? 1 : 0;
    }
  }
};

const drawTiming = (m: (number | null)[][]) => {
  const n = m.length;
  for (let i = 8; i < n - 8; i++) {
    const v = (i % 2 === 0) ? 1 : 0;
    if (m[6][i] == null) m[6][i] = v;
    if (m[i][6] == null) m[i][6] = v;
  }
};

const reserveFormatInfo = (m: (number | null)[][]) => {
  const n = m.length;
  for (let i = 0; i < 9; i++) {
    if (m[8][i] == null) m[8][i] = 0;
    if (m[i][8] == null) m[i][8] = 0;
  }
  for (let i = n - 8; i < n; i++) {
    if (m[8][i] == null) m[8][i] = 0;
    if (m[i][8] == null) m[i][8] = 0;
  }
  m[n - 8][8] = 1;
};

const setFormatBits = (m: (number | null)[][], formatBits: number) => {
  const n = m.length;
  const getBit = (i: number) => (formatBits >> i) & 1;

  const a: [number, number, number][] = [
    [8, 0, 14], [8, 1, 13], [8, 2, 12], [8, 3, 11], [8, 4, 10], [8, 5, 9],
    [8, 7, 8], [8, 8, 7], [7, 8, 6], [5, 8, 5], [4, 8, 4], [3, 8, 3], [2, 8, 2], [1, 8, 1], [0, 8, 0]
  ];

  for (const [r, c, b] of a) {
    m[r][c] = getBit(b);
  }

  const b: [number, number, number][] = [
    [n - 1, 8, 14], [n - 2, 8, 13], [n - 3, 8, 12], [n - 4, 8, 11], [n - 5, 8, 10], [n - 6, 8, 9],
    [n - 7, 8, 8], [n - 8, 8, 7],
    [8, n - 8, 6], [8, n - 7, 5], [8, n - 6, 4], [8, n - 5, 3], [8, n - 4, 2], [8, n - 3, 1], [8, n - 2, 0]
  ];

  for (const [r, c, bit] of b) {
    m[r][c] = getBit(bit);
  }
};

const bchRemainder = (value: number, poly: number): number => {
  let v = value;
  const msb = (x: number) => {
    let i = 0;
    while (x >> i) i++;
    return i - 1;
  };
  const polyMsb = msb(poly);
  while (msb(v) >= polyMsb) {
    v ^= poly << (msb(v) - polyMsb);
  }
  return v;
};

const makeFormatBits = (ecLevel: 'L' | 'M' | 'Q' | 'H', mask: number): number => {
  const ecMap: Record<typeof ecLevel, number> = { L: 1, M: 0, Q: 3, H: 2 };
  const data = (ecMap[ecLevel] << 3) | (mask & 0x7);
  const rem = bchRemainder(data << 10, 0b10100110111);
  const bits = ((data << 10) | rem) ^ 0b101010000010010;
  return bits & 0x7fff;
};

const placeData = (m: (number | null)[][], dataBits: number[]) => {
  const n = m.length;
  let bitIndex = 0;
  let dirUp = true;

  for (let col = n - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (let i = 0; i < n; i++) {
      const row = dirUp ? (n - 1 - i) : i;
      for (let c = 0; c < 2; c++) {
        const cc = col - c;
        if (m[row][cc] != null) continue;
        const bit = dataBits[bitIndex++] ?? 0;
        m[row][cc] = bit;
      }
    }
    dirUp = !dirUp;
  }
};

const applyMask = (m: (number | null)[][], mask: number) => {
  const n = m.length;
  const isFunc = (r: number, c: number) => {
    if (r <= 8 && c <= 8) return true;
    if (r <= 8 && c >= n - 8) return true;
    if (r >= n - 8 && c <= 8) return true;
    if (r === 6 || c === 6) return true;
    if (r === 8 || c === 8) return true;
    return false;
  };

  const maskFn = (r: number, c: number) => {
    switch (mask) {
      case 0: return (r + c) % 2 === 0;
      case 1: return r % 2 === 0;
      case 2: return c % 3 === 0;
      case 3: return (r + c) % 3 === 0;
      case 4: return ((Math.floor(r / 2) + Math.floor(c / 3)) % 2) === 0;
      case 5: return ((r * c) % 2 + (r * c) % 3) === 0;
      case 6: return (((r * c) % 2 + (r * c) % 3) % 2) === 0;
      case 7: return (((r + c) % 2 + (r * c) % 3) % 2) === 0;
      default: return false;
    }
  };

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const v = m[r][c];
      if (v == null) continue;
      if (isFunc(r, c)) continue;
      if (maskFn(r, c)) {
        m[r][c] = v ^ 1;
      }
    }
  }
};

const scoreMask = (m: (number | null)[][]): number => {
  const n = m.length;
  const get = (r: number, c: number) => (m[r][c] ?? 0);
  let penalty = 0;

  for (let r = 0; r < n; r++) {
    let runColor = get(r, 0);
    let runLen = 1;
    for (let c = 1; c < n; c++) {
      const col = get(r, c);
      if (col === runColor) {
        runLen++;
      } else {
        if (runLen >= 5) penalty += 3 + (runLen - 5);
        runColor = col;
        runLen = 1;
      }
    }
    if (runLen >= 5) penalty += 3 + (runLen - 5);
  }

  for (let c = 0; c < n; c++) {
    let runColor = get(0, c);
    let runLen = 1;
    for (let r = 1; r < n; r++) {
      const col = get(r, c);
      if (col === runColor) {
        runLen++;
      } else {
        if (runLen >= 5) penalty += 3 + (runLen - 5);
        runColor = col;
        runLen = 1;
      }
    }
    if (runLen >= 5) penalty += 3 + (runLen - 5);
  }

  for (let r = 0; r < n - 1; r++) {
    for (let c = 0; c < n - 1; c++) {
      const v = get(r, c);
      if (v === get(r, c + 1) && v === get(r + 1, c) && v === get(r + 1, c + 1)) penalty += 3;
    }
  }

  const pattern1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
  const pattern2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];

  const checkLine = (vals: number[]) => {
    for (let i = 0; i <= vals.length - 11; i++) {
      const seg = vals.slice(i, i + 11);
      if (seg.every((v, idx) => v === pattern1[idx]) || seg.every((v, idx) => v === pattern2[idx])) {
        penalty += 40;
      }
    }
  };

  for (let r = 0; r < n; r++) {
    const vals = new Array(n).fill(0).map((_, c) => get(r, c));
    checkLine(vals);
  }
  for (let c = 0; c < n; c++) {
    const vals = new Array(n).fill(0).map((_, r) => get(r, c));
    checkLine(vals);
  }

  let dark = 0;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      dark += get(r, c) ? 1 : 0;
    }
  }
  const total = n * n;
  const k = Math.abs((dark * 100) / total - 50);
  penalty += Math.floor(k / 5) * 10;

  return penalty;
};

const makeQrMatrixV1L = (text: string): QrMatrix => {
  const bytes = toUtf8Bytes(text);
  const bits: number[] = [];

  bitPush(bits, 0b0100, 4);
  bitPush(bits, clamp(bytes.length, 0, 0xff), 8);
  for (const b of bytes) bitPush(bits, b, 8);

  const capacityBits = 152;
  const terminator = Math.min(4, capacityBits - bits.length);
  bitPush(bits, 0, terminator);

  while (bits.length % 8 !== 0) bits.push(0);

  const dataBytes = bitsToBytes(bits);
  while (dataBytes.length < 19) {
    dataBytes.push(dataBytes.length % 2 === 0 ? 0xec : 0x11);
  }

  const ec = rsComputeRemainder(dataBytes, 7);
  const all = dataBytes.concat(ec);

  const dataBits: number[] = [];
  for (const b of all) bitPush(dataBits, b, 8);

  const n = 21;
  const m: (number | null)[][] = new Array(n).fill(0).map(() => new Array(n).fill(null));

  drawFinder(m, 0, 0);
  drawFinder(m, 0, n - 7);
  drawFinder(m, n - 7, 0);
  drawTiming(m);
  reserveFormatInfo(m);

  placeData(m, dataBits);

  let bestMask = 0;
  let bestPenalty = Number.POSITIVE_INFINITY;
  let best: (number | null)[][] | null = null;

  for (let mask = 0; mask < 8; mask++) {
    const cand = m.map(row => row.slice());
    applyMask(cand, mask);
    const fmt = makeFormatBits('L', mask);
    setFormatBits(cand, fmt);
    const p = scoreMask(cand);
    if (p < bestPenalty) {
      bestPenalty = p;
      bestMask = mask;
      best = cand;
    }
  }

  const chosen = best ?? m;
  const fmt = makeFormatBits('L', bestMask);
  setFormatBits(chosen, fmt);

  return chosen.map(row => row.map(v => (v ?? 0) === 1));
};

export const generateQrDataUrl = async (text: string, sizePx: number = 192): Promise<string> => {
  const matrix = makeQrMatrixV1L(text);
  const n = matrix.length;
  const quiet = 4;
  const modules = n + quiet * 2;

  const canvas = document.createElement('canvas');
  canvas.width = sizePx;
  canvas.height = sizePx;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, sizePx, sizePx);

  const scale = sizePx / modules;
  ctx.fillStyle = '#000000';

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!matrix[r][c]) continue;
      const x = (c + quiet) * scale;
      const y = (r + quiet) * scale;
      ctx.fillRect(x, y, scale, scale);
    }
  }

  return canvas.toDataURL('image/png');
};
