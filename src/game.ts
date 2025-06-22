import { Terminal } from "@effect/platform";
import { NodeTerminal } from "@effect/platform-node";
import { Effect, Layer, Logger, LogLevel, Ref, Schema } from "effect";
import { seqDiscard } from "./effectHelpers.ts";
import { Display, k } from "./game/display.ts";
import { Player, type PlayerClass, playerClasses } from "./game/player.ts";
import { TownSquare } from "./game/townSquare.ts";
import { SaveGame } from "./SaveGame.ts";

export class Game extends Effect.Service<Game>()("Game", {
  effect: Effect.gen(function* () {
    const { display, newLine, choice, displayYield, clearScreen } =
      yield* Display;

    const saveGame = yield* SaveGame;

    const terminal = yield* Terminal.Terminal;
    const player = yield* Player;

    const townSquareService = yield* TownSquare;

    const game: Effect.Effect<void, never, never> = Effect.gen(function* () {
      yield* clearScreen;
      yield* display`Game started`;
      yield* newLine;

      yield* townSquareService.intro;
      yield* townSquareService.townSquare.pipe(
        Effect.catchTags({
          PlayerDeadPoisonException: (e) =>
            Effect.gen(function* () {
              yield* player.updateGold(() => 0);
              const maxHealth = yield* player.getMaxHealth;
              yield* player.updateHealth(() => maxHealth);
              yield* displayYield`You died by ${e.type} poisoning, you lost your gold, the game will restart`;
              yield* newLine;

              yield* game;
            }),
          PlayerDeadDamageException: () =>
            Effect.gen(function* () {
              yield* player.updateGold(() => 0);
              const maxHealth = yield* player.getMaxHealth;
              yield* player.updateHealth(() => maxHealth);
              yield* displayYield`You died, you lost your gold, the game will restart`;
              yield* newLine;

              yield* game;
            }),
        })
      );
    });

    const gameSetup: Effect.Effect<void, never, never> = Effect.gen(
      function* () {
        yield* display`Welcome to the dragon game`;
        yield* newLine;

        yield* display`Would you like to configure your character or quickly start the game?
  [L] load saved game
  [C] configure
  [R] random`;

        yield* choice(
          {
            l: Effect.gen(function* () {
              yield* saveGame.loadGame().pipe(
                Effect.tapError(Effect.logDebug),
                Effect.tapError(() =>
                  seqDiscard(
                    newLine,
                    display(k.red(`Game loading failed...`)),
                    newLine
                  )
                ),
                Effect.orElse(() => gameSetup),
                Effect.zipRight(player.stats),
                Effect.zipRight(displayYield())
              );
            }),
            c: Effect.gen(function* () {
              yield* display`What's your name?`;

              const readName: Effect.Effect<string, never, never> =
                terminal.readLine.pipe(
                  Effect.flatMap(
                    Schema.decode(
                      Schema.Trim.pipe(
                        Schema.nonEmptyString(),
                        Schema.maxLength(100)
                      )
                    )
                  ),
                  Effect.tapError(() => display`Your name cannot be empty`),
                  Effect.orElse(() => readName)
                );

              const userName = yield* readName;

              yield* Ref.update(player.data, (data) => ({
                ...data,
                name: userName,
              }));

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
                Ref.update(player.data, (data) => ({
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
              yield* Ref.update(player.data, (data) => ({
                ...data,
                name: "random-name",
                class:
                  playerClasses[
                    Math.floor(Math.random() * playerClasses.length)
                  ],
              }));
              yield* player.stats;
              yield* displayYield();
            }),
          },
          { defaultOption: "r" }
        );
      }
    );

    return { game, gameSetup };
  }),
  dependencies: [
    TownSquare.Default,
    SaveGame.Default,
    Player.Default,
    Display.Default,
    NodeTerminal.layer,
  ],
}) {}

export const runGame = seqDiscard(
  Display.use((s) => s.clearScreen),
  Game.use((s) => s.gameSetup),
  Game.use((s) => s.game)
).pipe(
  Effect.asVoid,
  Effect.provide(Layer.mergeAll(Game.Default, Display.Default)),
  Logger.withMinimumLogLevel(LogLevel.Debug)
);
