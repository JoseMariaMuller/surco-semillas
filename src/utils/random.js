// Generador con semilla fija (mulberry32): cada cultivo sale siempre igual.
export function mulberry32(seed) {
  let a = seed >>> 0
  return function rand() {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashString(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function createRng(key) {
  const r = mulberry32(typeof key === 'number' ? key : hashString(key))
  return {
    next: r,
    range: (min, max) => min + (max - min) * r(),
    int: (min, max) => Math.floor(min + (max - min + 1) * r()),
    sign: () => (r() < 0.5 ? -1 : 1),
    pick: (arr) => arr[Math.floor(r() * arr.length)],
  }
}
