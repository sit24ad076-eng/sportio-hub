import React from "react";

/**
 * Lightweight pure JavaScript QR Code Generator (SVG).
 * Implements QR Code Model 2 with Reed-Solomon Error Correction.
 * Supports Byte Mode encoding suitable for signed tokens and URLs.
 */

// Galois Field GF(256) arithmetic tables for Reed-Solomon
const EXP_TABLE = new Uint8Array(512);
const LOG_TABLE = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = x;
    EXP_TABLE[i + 255] = x;
    LOG_TABLE[x] = i;
    x <<= 1;
    if (x & 256) x ^= 0x11d;
  }
})();

function gfMul(x, y) {
  if (x === 0 || y === 0) return 0;
  return EXP_TABLE[LOG_TABLE[x] + LOG_TABLE[y]];
}

function polyMul(p1, p2) {
  const result = new Uint8Array(p1.length + p2.length - 1);
  for (let i = 0; i < p1.length; i++) {
    for (let j = 0; j < p2.length; j++) {
      result[i + j] ^= gfMul(p1[i], p2[j]);
    }
  }
  return result;
}

function rsGeneratorPoly(degree) {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    poly = polyMul(poly, new Uint8Array([1, EXP_TABLE[i]]));
  }
  return poly;
}

function rsEncode(data, ecLen) {
  const gen = rsGeneratorPoly(ecLen);
  const msg = new Uint8Array(data.length + ecLen);
  msg.set(data);
  for (let i = 0; i < data.length; i++) {
    const coef = msg[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        msg[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }
  return msg.slice(data.length);
}

// Version table parameters: [version, totalDataBytes, ecBytes, numBlocks]
// Using Level L/M appropriate for tokens
const VERSION_PARAMS = [
  null,
  { ver: 1, totalData: 19, ec: 7, blocks: 1, size: 21 },
  { ver: 2, totalData: 34, ec: 10, blocks: 1, size: 25 },
  { ver: 3, totalData: 55, ec: 15, blocks: 1, size: 29 },
  { ver: 4, totalData: 80, ec: 20, blocks: 1, size: 33 },
  { ver: 5, totalData: 108, ec: 26, blocks: 1, size: 37 },
  { ver: 6, totalData: 136, ec: 18, blocks: 2, size: 41 },
  { ver: 7, totalData: 156, ec: 20, blocks: 2, size: 45 },
  { ver: 8, totalData: 194, ec: 24, blocks: 2, size: 49 },
  { ver: 9, totalData: 232, ec: 30, blocks: 2, size: 53 },
  { ver: 10, totalData: 274, ec: 18, blocks: 4, size: 57 },
  { ver: 11, totalData: 324, ec: 20, blocks: 4, size: 61 },
  { ver: 12, totalData: 370, ec: 24, blocks: 4, size: 65 },
  { ver: 13, totalData: 428, ec: 26, blocks: 4, size: 69 },
  { ver: 14, totalData: 461, ec: 30, blocks: 4, size: 73 },
];

function chooseVersion(dataLen) {
  // 4 bits mode indicator + 8/16 bits char count + dataLen*8 + terminator(4)
  for (let v = 1; v < VERSION_PARAMS.length; v++) {
    const charCountBits = v <= 9 ? 8 : 16;
    const requiredBits = 4 + charCountBits + dataLen * 8;
    const availableBits = VERSION_PARAMS[v].totalData * 8;
    if (requiredBits <= availableBits) {
      return VERSION_PARAMS[v];
    }
  }
  return VERSION_PARAMS[VERSION_PARAMS.length - 1];
}

export function generateQRCodeMatrix(text) {
  const encoder = new TextEncoder();
  const textBytes = encoder.encode(text);
  const vParam = chooseVersion(textBytes.length);
  const size = vParam.size;

  // Initialize matrix and reserved map
  const matrix = Array.from({ length: size }, () => Array(size).fill(0));
  const reserved = Array.from({ length: size }, () => Array(size).fill(false));

  function setModule(r, c, val) {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r][c] = val ? 1 : 0;
      reserved[r][c] = true;
    }
  }

  // 1. Finder patterns (top-left, top-right, bottom-left)
  function drawFinder(r0, c0) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = r0 + r;
        const nc = c0 + c;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          const isBorder = r === -1 || r === 7 || c === -1 || c === 7;
          const isBlack = (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
                          (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
                          (r >= 2 && r <= 4 && c >= 2 && c <= 4);
          setModule(nr, nc, !isBorder && isBlack);
        }
      }
    }
  }
  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // 2. Timing patterns
  for (let i = 8; i < size - 8; i++) {
    setModule(6, i, i % 2 === 0);
    setModule(i, 6, i % 2 === 0);
  }

  // 3. Dark module
  setModule(4 * vParam.ver + 9, 8, true);

  // 4. Alignment patterns for vParam >= 2
  if (vParam.ver >= 2) {
    const pos = [6, size - 7];
    if (size > 35) pos.splice(1, 0, Math.floor((size - 1) / 2));
    for (const r of pos) {
      for (const c of pos) {
        if (reserved[r][c]) continue;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const isBlack = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
            setModule(r + dr, c + dc, isBlack);
          }
        }
      }
    }
  }

  // 5. Reserve format info areas
  for (let i = 0; i <= 8; i++) {
    if (i !== 6) {
      if (!reserved[8][i]) reserved[8][i] = true;
      if (!reserved[i][8]) reserved[i][8] = true;
    }
  }
  for (let i = 0; i < 8; i++) {
    reserved[8][size - 1 - i] = true;
    reserved[size - 1 - i][8] = true;
  }

  // 6. Encode Data bitstream
  const bitstream = [];
  const addBits = (val, len) => {
    for (let i = len - 1; i >= 0; i--) {
      bitstream.push((val >> i) & 1);
    }
  };

  // Byte mode (0100)
  addBits(0b0100, 4);
  const charBits = vParam.ver <= 9 ? 8 : 16;
  addBits(textBytes.length, charBits);
  for (const b of textBytes) {
    addBits(b, 8);
  }

  // Terminator
  const totalDataBits = vParam.totalData * 8;
  const termLen = Math.min(4, totalDataBits - bitstream.length);
  for (let i = 0; i < termLen; i++) bitstream.push(0);

  // Align to byte
  while (bitstream.length % 8 !== 0) bitstream.push(0);

  // Pad bytes 0xEC, 0x11
  let padToggle = false;
  while (bitstream.length < totalDataBits) {
    addBits(padToggle ? 0x11 : 0xec, 8);
    padToggle = !padToggle;
  }

  // Group into bytes
  const dataBytes = [];
  for (let i = 0; i < bitstream.length; i += 8) {
    let byte = 0;
    for (let b = 0; b < 8; b++) byte = (byte << 1) | bitstream[i + b];
    dataBytes.push(byte);
  }

  // Error correction
  const ecLen = vParam.ec;
  const ecBytes = rsEncode(new Uint8Array(dataBytes), ecLen);
  const allCodewords = [...dataBytes, ...ecBytes];

  // Convert to final bits
  const finalBits = [];
  for (const byte of allCodewords) {
    for (let i = 7; i >= 0; i--) {
      finalBits.push((byte >> i) & 1);
    }
  }

  // 7. Place data bits in matrix (right to left, vertical zigzag)
  let bitIdx = 0;
  let dir = -1; // upward
  let r = size - 1;
  let c = size - 1;

  while (c > 0) {
    if (c === 6) c--; // Skip vertical timing column
    for (let i = 0; i < size; i++) {
      const row = r;
      for (let colOffset = 0; colOffset < 2; colOffset++) {
        const col = c - colOffset;
        if (!reserved[row][col]) {
          let bit = 0;
          if (bitIdx < finalBits.length) {
            bit = finalBits[bitIdx++];
          }
          // Mask pattern 0: (row + col) % 2 == 0
          const mask = (row + col) % 2 === 0;
          matrix[row][col] = (bit ^ (mask ? 1 : 0)) ? 1 : 0;
        }
      }
      r += dir;
    }
    dir = -dir;
    r += dir;
    c -= 2;
  }

  // 8. Format bits (Mask 0, Error Level L: 01)
  // Precomputed format info string with BCH error code: 0b111011111000100 (0x77c4)
  const formatBits = [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0];
  // Apply to top-left
  const topCoords = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
  ];
  for (let i = 0; i < 15; i++) {
    const [fr, fc] = topCoords[i];
    matrix[fr][fc] = formatBits[i];
  }
  // Apply to split around edges
  for (let i = 0; i < 7; i++) {
    matrix[size - 1 - i][8] = formatBits[i];
  }
  for (let i = 0; i < 8; i++) {
    matrix[8][size - 8 + i] = formatBits[7 + i];
  }

  return matrix;
}

/**
 * Render SVG QR code component in pure React/SVG.
 */
export function QRCodeSVG({ value, size = 180, fgColor = "#112f45", bgColor = "#ffffff" }) {
  if (!value) return null;
  try {
    const matrix = generateQRCodeMatrix(value);
    const numCells = matrix.length;
    const cellSize = size / numCells;

    const rects = [];
    for (let r = 0; r < numCells; r++) {
      for (let c = 0; c < numCells; c++) {
        if (matrix[r][c] === 1) {
          rects.push(
            `<rect x="${(c * cellSize).toFixed(2)}" y="${(r * cellSize).toFixed(2)}" width="${cellSize.toFixed(2)}" height="${cellSize.toFixed(2)}" fill="${fgColor}" />`
          );
        }
      }
    }

    return React.createElement("svg", {
      width: size,
      height: size,
      viewBox: `0 0 ${size} ${size}`,
      style: { display: "block", borderRadius: "10px", background: bgColor, padding: "10px", boxSizing: "content-box" },
      dangerouslySetInnerHTML: {
        __html: `<rect width="100%" height="100%" fill="${bgColor}" />` + rects.join(""),
      },
    });
  } catch (err) {
    console.warn("QR generation fallback:", err);
    return React.createElement(
      "div",
      { style: { width: size, height: size, background: "#f0f4f7", display: "grid", placeItems: "center", borderRadius: "8px" } },
      React.createElement("span", { style: { fontSize: "11px", color: "#64748b" } }, "QR Preview")
    );
  }
}
