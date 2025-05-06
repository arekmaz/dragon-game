import { Terminal } from "@effect/platform/Terminal";
import { Data, Effect } from "effect";
import { Display } from "./display.ts";
import { Forest } from "./forest.ts";
import { Healer } from "./healer.ts";
import { Inn } from "./inn.ts";
import { Player, PlayerDeadException } from "./player.ts";

export class QuitTownSquareException extends Data.TaggedError(
  "QuitTownSquareException"
) {}

export class TownSquare extends Effect.Service<TownSquare>()("TownSquare", {
  effect: Effect.gen(function* () {
    const { display, newLine, choice, clearScreen } = yield* Display;

    const townSquareIntro = Effect.zipRight(
      display`
  Welcome to the Town Square, where do you want to go?
  `,
      newLine
    );

    const backToTownSquare = Effect.zipRight(
      display`
  Welcome to the Town Square, where do you want to go?
  `,
      newLine
    );

    const townSquare: Effect.Effect<
      void,
      void | PlayerDeadException | QuitTownSquareException,
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
          f: Effect.all([
            clearScreen,
            forestService.forestIntro,
            forestService.forest,
            backToTownSquare,
            townSquare,
          ]),
          w: Effect.all([
            clearScreen,
            display`shop`,
            backToTownSquare,
            townSquare,
          ]),
          b: Effect.all([
            clearScreen,
            display`bank`,
            backToTownSquare,
            townSquare,
          ]),
          h: Effect.all([
            clearScreen,
            healerService.healerIntro,
            healerService.healer,
            backToTownSquare,
            townSquare,
          ]),
          i: Effect.all([
            clearScreen,
            innService.innIntro,
            innService.inn,
            backToTownSquare,
            townSquare,
          ]),
          s: Effect.all([stats, townSquare]),
          q: Effect.all([
            display`quitting...`,
            Effect.sleep(1000),
            Effect.fail(new QuitTownSquareException()),
          ]),
        },
        { defaultOption: "s" }
      );
    });
    return {
      townSquareIntro,
      townSquare,
    };
  }),
  dependencies: [Display.Default],
}) {}
