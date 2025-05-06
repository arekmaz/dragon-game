import { Terminal } from "@effect/platform";
import { Effect, Ref, Schema } from "effect";
import { Player, playerClasses } from "./game/player.ts";
import { TownSquare } from "./game/townSquare.ts";
import { Forest } from "./game/forest.ts";
import { Healer } from "./game/healer.ts";
import { Inn } from "./game/inn.ts";
import { Display } from "./game/display.ts";

const game: Effect.Effect<
  void,
  void,
  TownSquare | Terminal.Terminal | Forest | Player | Healer | Inn | Display
> = Effect.gen(function* () {
  const { display, newLine, clearScreen, displayYield } = yield* Display;

  const townSquareService = yield* TownSquare;

  yield* clearScreen;
  yield* display`Game started`;
  yield* newLine;

  yield* townSquareService.townSquareIntro;
  yield* townSquareService.townSquare.pipe(
    Effect.zipRight(
      Effect.gen(function* () {
        yield* newLine;
        yield* display`Game finished`;
        yield* newLine;
        yield* display`-------------`;
        yield* newLine;
        yield* Effect.sleep(2000);

        yield* game;
      })
    ),
    Effect.catchTags({
      PlayerDeadException: () =>
        Effect.gen(function* () {
          yield* Player.updateGold(() => 0);
          const maxHealth = yield* Player.maxHealth;
          yield* Player.updateHealth(() => maxHealth);
          yield* displayYield`You died, you lost your gold, the game will restart`;

          yield* Effect.sleep(2000);

          yield* game;
        }),
      QuitTownSquareException: () => Effect.void,
    })
  );
});

const gameSetup = Effect.gen(function* () {
  const { display, newLine, choice, displayYield } = yield* Display;

  const terminal = yield* Terminal.Terminal;
  const ref = yield* Player;

  yield* display`Welcome to the dragon game`;
  yield* newLine;

  yield* display`Would you like to configure your character or quickly start the game?`;
  yield* newLine;

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
      [R] archer`;

        yield* choice({
          m: Ref.update(ref.data, (data) => ({
            ...data,
            class: "mage" as const,
          })),
          a: Ref.update(ref.data, (data) => ({
            ...data,
            class: "assassin" as const,
          })),
          w: Ref.update(ref.data, (data) => ({
            ...data,
            class: "warrior" as const,
          })),
          r: Ref.update(ref.data, (data) => ({
            ...data,
            class: "archer" as const,
          })),
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
  Effect.provide(Display.Default)
) as Effect.Effect<void, never, never>;
