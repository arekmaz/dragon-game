import { Effect } from "effect";

export const seqDiscard = <A extends Effect.Effect<any, any, any>[]>(
  ...effects: A
) => Effect.all(effects, { discard: true });
