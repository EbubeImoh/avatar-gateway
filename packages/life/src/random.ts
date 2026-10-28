/** Seeded, repeatable randomness so a life replays identically from the same identity. */

function hashSeed(seed: string | number): number {
  if (typeof seed === "number") {
    if (!Number.isFinite(seed)) throw new Error("Life seed must be a finite number or non-empty string.");
    const value = Math.trunc(seed) >>> 0;
    return value === 0 ? 0x6d2b79f5 : value;
  }
  if (!seed.trim() || seed.length > 1_000) throw new Error("Life seed must be a finite number or non-empty string.");
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    hash = Math.imul(hash ^ seed.charCodeAt(index), 0x01000193) >>> 0;
  }
  return hash === 0 ? 0x6d2b79f5 : hash;
}

export class SeededRandom {
  private state: number;

  constructor(seed: string | number) {
    this.state = hashSeed(seed);
  }

  next(): number {
    let value = (this.state += 0x6d2b79f5) >>> 0;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  }

  clone(): SeededRandom {
    return new SeededRandom(this.state);
  }
}

/** Create a repeatable random source without relying on global Math.random. */
export function createSeededRandom(seed: string | number): () => number {
  const random = new SeededRandom(seed);
  return () => random.next();
}
