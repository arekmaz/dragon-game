import { Effect } from "effect";
import { choice, clearScreen, display, newLine, quit } from "./display.ts";
import { stats } from "./player.ts";
import { forest } from "./forest.ts";

export const townSquareIntro = Effect.zipRight(
  display`
  Welcome to the Town Square, where do you want to go?
  `,
  newLine
);

const townSquare = Effect.fn("townSquare")(function* (): any {
  yield* display`
  [F] Go to the forest
  [W] Swords and armours
  [H] Town's healer
  [B] Bank
  [I] The inn
  [S] Show stats
  [Q] Quit the game`;
  yield* newLine;

  yield* choice({
    f: clearScreen.pipe(
      Effect.zipRight(forestIntro),
      Effect.zipRight(forest())
    ),
    w: display`shop`.pipe(Effect.zipRight(townSquare())),
    b: display`bank`.pipe(Effect.zipRight(townSquare())),
    h: Effect.all([clearScreen, healerIntro, healer(), townSquare()]),
    i: Effect.all([clearScreen, innIntro, inn(), townSquare()]),
    s: stats().pipe(Effect.zipRight(townSquare())),
    q: display`quitting...`.pipe(Effect.zipRight(quit)),
  })({ defaultOption: "s" });
});
