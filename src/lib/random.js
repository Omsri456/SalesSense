// Deterministic pseudo-random helpers. Used so that picking the same
// SKU/model/horizon always regenerates the same forecast numbers,
// instead of the chart jumping around on every re-render.

export function hashString(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  }
  return h >>> 0
}

// mulberry32 - tiny, fast seeded PRNG returning [0, 1)
export function mulberry32(seed) {
  let a = seed
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function seededRandom(...parts) {
  return mulberry32(hashString(parts.join('|')))
}
