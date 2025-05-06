import { Effect } from "effect";
import { choice, clearScreen, display, newLine, quit } from "./display.ts";
import { Player, PlayerDeadException, stats } from "./player.ts";
import { Forest } from "./forest.ts";
import { Healer } from "./healer.ts";
import { Inn } from "./inn.ts";
import { Terminal } from "@effect/platform/Terminal";

export class TownSquare extends Effect.Service<TownSquare>()("TownSquare", {
  effect: Effect.gen(function* () {
    return {
      townSquareIntro,
      townSquare,
    };
  }),
}) {}

const townSquareIntro = Effect.zipRight(
  display`
  Welcome to the Town Square, where do you want to go?
  `,
  newLine
);

const townSquare: Effect.Effect<
  void,
  void | PlayerDeadException,
  Terminal | Forest | Player | Healer | Inn
> = Effect.gen(function* () {
  const forestService = yield* Forest;
  const healerService = yield* Healer;
  const innService = yield* Inn;

  yield* display`
  [F] Go to the forest
  [W] Swords and armours
  [H] Town's healer
  [B] Bank
  [I] The inn
  [S] Show stats
  [Q] Quit the game`;
  yield* newLine;

  yield* choice(
    {
      f: clearScreen.pipe(
        Effect.zipRight(forestService.forestIntro),
        Effect.zipRight(forestService.forest)
      ),
      w: display`shop`,
      b: display`bank`,
      h: Effect.all([
        clearScreen,
        healerService.healerIntro,
        healerService.healer,
        townSquare,
      ]),
      i: Effect.all([
        clearScreen,
        innService.innIntro,
        innService.inn,
        townSquare,
      ]),
      s: stats.pipe(Effect.zipRight(townSquare)),
      q: display`quitting...`.pipe(Effect.zipRight(quit)),
    },
    { defaultOption: "s" }
  );
});
