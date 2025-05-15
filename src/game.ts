import { Terminal } from "@effect/platform";
import { Effect, Ref, Schema } from "effect";
import { Player, type PlayerClass, playerClasses } from "./game/player.ts";
import { TownSquare } from "./game/townSquare.ts";
import { Forest } from "./game/forest.ts";
import { Healer } from "./game/healer.ts";
import { Inn } from "./game/inn.ts";
import { Display } from "./game/display.ts";
import { Bank } from "./game/bank.ts";
import { Weaponsmith } from "./game/weaponsmith.ts";
import { Armorsmith } from "./game/armorsmith.ts";

const game: Effect.Effect<void, never, TownSquare | Player | Display> =
  Effect.gen(function* () {
    const { display, newLine, clearScreen, displayYield } = yield* Display;

    const townSquareService = yield* TownSquare;

    yield* clearScreen;
    yield* display`Game started`;
    yield* newLine;

    yield* townSquareService.townSquareIntro;
    yield* townSquareService.townSquare.pipe(
      Effect.catchTags({
        PlayerDeadException: () =>
          Effect.gen(function* () {
            yield* Player.updateGold(() => 0);
            const maxHealth = yield* Player.maxHealth;
            yield* Player.updateHealth(() => maxHealth);
            yield* displayYield`You died, you lost your gold, the game will restart`;

            yield* game;
          }),
      })
    );
  });

const gameSetup = Effect.gen(function* () {
  const { display, newLine, choice, displayYield } = yield* Display;

  const terminal = yield* Terminal.Terminal;
  const ref = yield* Player;

  yield* display`Welcome to the dragon game`;
  yield* newLine;

  yield* display`Would you like to configure your character or quickly start the game?
  [C] configure
  [R] random`;

  yield* choice(
    {
      c: Effect.gen(function* () {
        yield* display`What's your name?`;

        const readName: Effect.Effect<string, never, Terminal.Terminal> =
          terminal.readLine.pipe(
            Effect.flatMap(
              Schema.decode(
                Schema.Trim.pipe(Schema.nonEmptyString(), Schema.maxLength(100))
              )
            ),
            Effect.tapError(() => display`Your name cannot be empty`),
            Effect.orElse(() => readName)
          );

        const userName = yield* readName;
        yield* Ref.update(ref.data, (data) => ({ ...data, name: userName }));

        yield* newLine;

        yield* display`
          Hello, ${userName}!

          What is your class?
            [M] mage
            [A] assassin
            [W] warrior
            [R] archer
        `;

        const setPlayerClass = (c: PlayerClass) =>
          Ref.update(ref.data, (data) => ({
            ...data,
            class: c,
          }));

        yield* choice({
          m: setPlayerClass("mage"),
          a: setPlayerClass("assassin"),
          w: setPlayerClass("warrior"),
          r: setPlayerClass("archer"),
        });
      }),
      r: Effect.gen(function* () {
        yield* Ref.update(ref.data, (data) => ({
          ...data,
          name: "random-name",
          class:
            playerClasses[Math.floor(Math.random() * playerClasses.length)],
        }));
        yield* Player.use((s) => s.stats);
        yield* displayYield();
      }),
    },
    { defaultOption: "r" }
  );
});

export const runGame = Effect.all([
  Display.use((s) => s.clearScreen),
  gameSetup,
  game,
]).pipe(
  Effect.asVoid,
  Effect.provide(Player.Default),
  Effect.provide(TownSquare.Default),
  Effect.provide(Forest.Default),
  Effect.provide(Healer.Default),
  Effect.provide(Inn.Default),
  Effect.provide(Bank.Default),
  Effect.provide(Weaponsmith.Default),
  Effect.provide(Armorsmith.Default),
  Effect.provide(Display.Default)
) as Effect.Effect<void, never, never>;
