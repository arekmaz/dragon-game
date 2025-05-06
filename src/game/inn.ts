import { Effect } from "effect";
import { display, newLine, clearScreen, choice } from "./display.ts";
import { stats } from "./player.ts";
import { townSquareIntro } from "./townSquare.ts";

export const innIntro = display`Welcome to the Town's Inn, it's awfully crowded today`;

const inn = Effect.fn("inn")(function* (): any {
  yield* newLine;
  yield* display`
    What do you do next?
  [N] check town newsboard
  [S] show stats
  [R] return to the town square`;

  yield* choice({
    n: display`news board`.pipe(Effect.zipRight(inn())),
    s: stats().pipe(Effect.zipRight(inn())),
    r: clearScreen.pipe(
      Effect.zipRight(townSquareIntro),
      Effect.zipRight(townSquare())
    ),
  })({ defaultOption: "s" });
});
