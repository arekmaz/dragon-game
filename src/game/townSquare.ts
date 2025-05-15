import { Data, Effect } from "effect";
import { Display } from "./display.ts";
import { Forest } from "./forest.ts";
import { Healer } from "./healer.ts";
import { Inn } from "./inn.ts";
import { Player, PlayerDeadException } from "./player.ts";
import { Bank } from "./bank.ts";
import { Weaponsmith } from "./weaponsmith.ts";
import { Armorsmith } from "./armorsmith.ts";
import { SaveGame } from "../game.ts";

export class QuitTownSquareException extends Data.TaggedError(
  "QuitTownSquareException"
) {}

export class TownSquare extends Effect.Service<TownSquare>()("TownSquare", {
  effect: Effect.gen(function* () {
    const { display, newLine, choice, clearScreen } = yield* Display;
    const forest = yield* Forest;
    const healer = yield* Healer;
    const inn = yield* Inn;
    const bank = yield* Bank;
    const weaponsmith = yield* Weaponsmith;
    const armorsmith = yield* Armorsmith;

    const intro = Effect.zipRight(
      display`
        Welcome to the Town Square, where do you want to go?
      `,
      newLine
    );

    const backToTownSquare = Effect.zipRight(
      display`
        Welcome back to the Town Square, where do you want to go?
      `,
      newLine
    );

    const townSquare: Effect.Effect<
      void,
      PlayerDeadException,
      Player | SaveGame
    > = Effect.gen(function* () {
      yield* display`
        [F] Go to the forest
        [W] Weaponsmith
        [A] Armorsmith
        [H] Town's healer
        [B] Bank
        [I] The inn
        [S] Show stats
        [Q] Quit the game
      `;

      yield* choice(
        {
          f: Effect.all([
            clearScreen,
            forest.intro,
            forest.forest,
            clearScreen,
            backToTownSquare,
            townSquare,
          ]),
          w: Effect.all([
            clearScreen,
            weaponsmith.intro,
            weaponsmith.weaponsmith,
            clearScreen,
            backToTownSquare,
            townSquare,
          ]),
          a: Effect.all([
            clearScreen,
            armorsmith.intro,
            display`not available yet`,
            Effect.sleep(1000),
            clearScreen,
            backToTownSquare,
            townSquare,
          ]),
          b: Effect.all([
            clearScreen,
            bank.intro,
            bank.bank,
            clearScreen,
            backToTownSquare,
            townSquare,
          ]),
          h: Effect.all([
            clearScreen,
            healer.intro,
            healer.healer,
            clearScreen,
            backToTownSquare,
            townSquare,
          ]),
          i: Effect.all([
            clearScreen,
            inn.intro,
            inn.inn,
            clearScreen,
            backToTownSquare,
            townSquare,
          ]),
          s: Effect.all([Player.stats, townSquare]),
          q: Effect.all([display`quitting...`, Effect.sleep(1000)]),
        },
        { defaultOption: "s" }
      );
    });

    return {
      intro,
      townSquare,
    };
  }),
  dependencies: [
    Display.Default,
    Forest.Default,
    Healer.Default,
    Inn.Default,
    Weaponsmith.Default,
    Armorsmith.Default,
  ],
}) {}
