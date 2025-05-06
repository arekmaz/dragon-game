import { Terminal } from "@effect/platform";
import { Effect, Ref, Schema } from "effect";
import {
  choice,
  clearScreen,
  display,
  displayYield,
  newLine,
} from "./game/display.ts";
import { Player } from "./game/player.ts";
import { TownSquare } from "./game/townSquare.ts";
import { Forest } from "./game/forest.ts";
import { Healer } from "./game/healer.ts";
import { Inn } from "./game/inn.ts";

const game: Effect.Effect<
  void,
  void,
  TownSquare | Terminal.Terminal | Forest | Player | Healer | Inn
> = Effect.gen(function* () {
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

          yield* game;
        }),
      QuitTownSquareException: () => Effect.void,
    })
  );
});

const gameSetup = Effect.gen(function* () {
  const terminal = yield* Terminal.Terminal;
  const ref = yield* Player;

  yield* display`Welcome to the dragon game`;
  yield* newLine;
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
  yield* Ref.update(ref, (data) => ({ ...data, name: userName }));

  yield* display`
    Hello, ${userName}!

    What is your class?
      [M] mage
      [A] assassin
      [W] warrior
      [R] archer`;

  yield* choice({
    m: Ref.update(ref, (data) => ({ ...data, class: "mage" as const })),
    a: Ref.update(ref, (data) => ({ ...data, class: "assassin" as const })),
    w: Ref.update(ref, (data) => ({ ...data, class: "warrior" as const })),
    r: Ref.update(ref, (data) => ({ ...data, class: "archer" as const })),
  });
});

export const runGame = gameSetup.pipe(
  Effect.zipRight(game),
  Effect.provide(Player.Default),
  Effect.provide(TownSquare.Default),
  Effect.provide(Forest.Default),
  Effect.provide(Healer.Default),
  Effect.provide(Inn.Default)
) as Effect.Effect<void, never, never>;
