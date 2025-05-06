import { Terminal } from "@effect/platform/Terminal";
import { Effect } from "effect";
import { choice, display, newLine } from "./display.ts";
import { Player, stats } from "./player.ts";

export class Inn extends Effect.Service<Inn>()("Inn", {
  effect: Effect.gen(function* () {
    return {
      innIntro,
      inn,
    };
  }),
}) {}

const innIntro = display`Welcome to the Town's Inn, it's awfully crowded today`;

const inn: Effect.Effect<void, never, Terminal | Player> = Effect.gen(
  function* () {
    yield* newLine;
    yield* display`
    What do you do next?
  [N] check town newsboard
  [S] show stats
  [R] return to the town square`;

    yield* choice(
      {
        n: display`news board`.pipe(Effect.zipRight(inn)),
        s: stats.pipe(Effect.zipRight(inn)),
        r: Effect.void,
      },
      { defaultOption: "s" }
    );
  }
);
