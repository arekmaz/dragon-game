import { Effect } from "effect";

function xmur3(str: string) {
  for (var i = 0, h = 1779033703 ^ str.length; i < str.length; i++)
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
  h = (h << 13) | (h >>> 19);
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function sfc32(a: number, b: number, c: number, d: number) {
  return function () {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    var t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

function createRandomIterator(seed: string) {
  const seedFunc = xmur3(seed);
  const rand = sfc32(seedFunc(), seedFunc(), seedFunc(), seedFunc());

  return {
    [Symbol.iterator]() {
      return this;
    },
    next() {
      return { value: rand(), done: false };
    },
  };
}

export class DeterministicRandom extends Effect.Service<DeterministicRandom>()(
  "DeterministicRandom",
  {
    effect: Effect.gen(function* () {
      const iterator = createRandomIterator("my-seed");

      return {
        nextInt: Effect.sync(() =>
          Math.floor(iterator.next().value * Number.MAX_SAFE_INTEGER)
        ),
        nextBoolean: Effect.sync(() => iterator.next().value < 0.5),
        nextIntBetween: (min: number, max: number) =>
          Effect.sync(
            () => Math.floor(iterator.next().value * (max - min + 1)) + min
          ),
        choice: <A>(elements: A[]) =>
          Effect.sync(
            () => elements[Math.floor(iterator.next().value * elements.length)]
          ),
      };
    }),
  }
) {}
