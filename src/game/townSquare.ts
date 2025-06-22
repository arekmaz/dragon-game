import { Data, Effect } from "effect";
import { Display } from "./display.ts";
import { Forest } from "./forest.ts";
import { Healer } from "./healer.ts";
import { Inn } from "./inn.ts";
import {
  Player,
  PlayerDeadDamageException,
  PlayerDeadPoisonException,
} from "./player.ts";
import { Bank } from "./bank.ts";
import { Weaponsmith } from "./weaponsmith.ts";
import { Armorsmith } from "./armorsmith.ts";
import { SaveGame } from "../game.ts";
import { seqDiscard } from "../effectHelpers.ts";

export class QuitTownSquareException extends Data.TaggedError(
  "QuitTownSquareException"
) {}

export class TownSquare extends Effect.Service<TownSquare>()("TownSquare", {
  effect: Effect.gen(function* () {
    const { display, newLine, choice, clearScreen, displayYield } =
      yield* Display;
    const player = yield* Player;
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
      PlayerDeadDamageException | PlayerDeadPoisonException,
      never
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
          f: seqDiscard(
            clearScreen,
            forest.intro,
            forest.forest,
            clearScreen,
            backToTownSquare,
            townSquare
          ),
          w: seqDiscard(
            clearScreen,
            weaponsmith.intro,
            weaponsmith.weaponsmith,
            clearScreen,
            backToTownSquare,
            townSquare
          ),
          a: seqDiscard(
            clearScreen,
            armorsmith.intro,
            display`not available yet`,
            displayYield(),
            clearScreen,
            backToTownSquare,
            townSquare
          ),
          b: seqDiscard(
            clearScreen,
            bank.intro,
            bank.bank,
            clearScreen,
            backToTownSquare,
            townSquare
          ),
          h: seqDiscard(
            clearScreen,
            healer.intro,
            healer.healer,
            clearScreen,
            backToTownSquare,
            townSquare
          ),
          i: seqDiscard(
            clearScreen,
            inn.intro,
            inn.inn,
            clearScreen,
            backToTownSquare,
            townSquare
          ),
          s: seqDiscard(player.stats, townSquare),
          q: seqDiscard(display`quitting...`, Effect.sleep(1000)),
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
    Bank.Default,
    Player.Default,
    SaveGame.Default,
  ],
}) {}
