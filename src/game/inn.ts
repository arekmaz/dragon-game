import { Effect } from "effect";
import { Display } from "./display.ts";
import { Player } from "./player.ts";

export class Inn extends Effect.Service<Inn>()("Inn", {
  effect: Effect.gen(function* () {
    const { display, newLine, choice } = yield* Display;
    const intro = display`Welcome to the Town's Inn, it's awfully crowded today`;

    const inn: Effect.Effect<void, never, Player> = Effect.gen(function* () {
      yield* newLine;
      yield* display`
    What do you do next?
  [N] check town newsboard
  [S] show stats
  [R] return to the town square`;

      yield* choice(
        {
          n: display`news board`.pipe(Effect.zipRight(inn)),
          s: Player.stats.pipe(Effect.zipRight(inn)),
          r: Effect.void,
        },
        { defaultOption: "s" }
      );
    });

    return {
      intro,
      inn,
    };
  }),
  dependencies: [Display.Default],
}) {}
