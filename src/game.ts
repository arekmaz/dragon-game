import { Terminal } from "@effect/platform";
import { Effect, Random, Ref, Schema } from "effect";
import {
  display,
  displayLines,
  newLine,
  choice,
  displayYield,
  clearScreen,
  quit,
} from "./game/display.ts";
import { Player } from "./game/player.ts";

const game = Effect.gen(function* (): any {
  yield* clearScreen;
  yield* display`Game started`;
  yield* newLine;

  yield* townSquareIntro;
  yield* townSquare();

  yield* newLine;
  yield* display`Game finished`;
  yield* newLine;
  yield* display`-------------`;
  yield* newLine;
  yield* Effect.sleep(2000);

  yield* game;
});

const restartGameIfPlayerIsDead = Effect.gen(function* () {
  if (yield* Player.isAlive) {
    return;
  }

  yield* Player.updateGold(() => 0);
  const maxHealth = yield* Player.maxHealth;
  yield* Player.updateHealth(() => maxHealth);
  yield* displayYield`You died, you lost your gold, the game will restart`;
  yield* game;
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
  })();
});

export const runGame = gameSetup.pipe(
  Effect.zipRight(game),
  Effect.provide(Player.Default)
) as Effect.Effect<void, never, never>;
