import { Terminal } from "@effect/platform";
import {
  Effect,
  Ref,
  Schema,
  ParseResult,
  Logger,
  LogLevel,
  Data,
  Layer,
} from "effect";
import {
  EqItemSchema,
  Player,
  type PlayerClass,
  playerClasses,
  PlayerData,
} from "./game/player.ts";
import { TownSquare } from "./game/townSquare.ts";
import { Forest } from "./game/forest.ts";
import { Healer } from "./game/healer.ts";
import { Inn } from "./game/inn.ts";
import { Display, k } from "./game/display.ts";
import { Bank } from "./game/bank.ts";
import { WeaponSchema, Weaponsmith } from "./game/weaponsmith.ts";
import { Armorsmith } from "./game/armorsmith.ts";
import { FileSystem } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import { seqDiscard } from "./effectHelpers.ts";
import { Mission } from "./game/mission.ts";

class GameData extends Schema.Class<GameData>("GameData")({
  player: PlayerData,
  bankBalance: Schema.NonNegativeInt,
}) {}

class PersistedGameData extends Schema.Class<PersistedGameData>(
  "PersistedGameData"
)({
  ...GameData.fields,
  player: Schema.Struct({
    ...PlayerData.fields,
    eq: Schema.Struct({
      leftHand: Schema.OptionFromNullOr(WeaponSchema),
      rightHand: Schema.OptionFromNullOr(WeaponSchema),
      items: Schema.Data(Schema.Array(EqItemSchema)),
    }),
  }),
}) {}

const JsonGameData = Schema.parseJson(
  Schema.transform(PersistedGameData, GameData, {
    decode: (encoded) => encoded,
    encode: (decoded) => ({
      ...decoded,
      player: {
        ...decoded.player,
        eq: {
          ...decoded.player.eq,
          items: Data.array(decoded.player.eq.items),
        },
      },
    }),
    strict: true,
  }),
  { space: 2 }
);

export class SaveGame extends Effect.Service<SaveGame>()("SaveGame", {
  effect: Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const player = yield* Player;
    const bank = yield* Bank;

    const defaultSaveFile = "game.json";

    const saveGame = (fileName: string = defaultSaveFile) =>
      Effect.gen(function* () {
        const saveData = yield* Schema.encode(JsonGameData)({
          player: yield* player.data,
          bankBalance: yield* bank.bankBalanceRef,
        });

        yield* fs.writeFileString(fileName, saveData);
      });

    const loadGame = (fileName: string = defaultSaveFile) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;

        const gameData = yield* fs.readFileString(fileName).pipe(
          Effect.flatMap(Schema.decode(JsonGameData)),
          Effect.tapErrorTag("ParseError", (e) =>
            Effect.logError(ParseResult.TreeFormatter.formatErrorSync(e))
          )
        );

        yield* Ref.update(player.data, () => gameData.player);
        yield* Ref.update(bank.bankBalanceRef, () => gameData.bankBalance);
      });

    return { saveGame, loadGame };
  }),
  dependencies: [NodeFileSystem.layer, Bank.Default, Player.Default],
  accessors: true,
}) {}

const game: Effect.Effect<
  void,
  never,
  TownSquare | Player | Display | SaveGame
> = Effect.gen(function* () {
  const { display, newLine, clearScreen, displayYield } = yield* Display;
  const player = yield* Player;

  const townSquareService = yield* TownSquare;

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
          yield* displayYield`You died by ${e.data.type} poisoning, you lost your gold, the game will restart`;
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

const gameSetup: Effect.Effect<
  void,
  never,
  SaveGame | FileSystem.FileSystem | Player | Display | Terminal.Terminal
> = Effect.gen(function* () {
  const { display, newLine, choice, displayYield } = yield* Display;

  const terminal = yield* Terminal.Terminal;
  const player = yield* Player;

  yield* display`Welcome to the dragon game`;
  yield* newLine;

  yield* display`Would you like to configure your character or quickly start the game?
  [L] load saved game
  [C] configure
  [R] random`;

  yield* choice(
    {
      l: Effect.gen(function* () {
        yield* SaveGame.loadGame().pipe(
          Effect.tapError(Effect.logDebug),
          Effect.tapError((error) =>
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
        yield* Ref.update(player.data, (data) => ({ ...data, name: userName }));

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
            playerClasses[Math.floor(Math.random() * playerClasses.length)],
        }));
        yield* player.stats;
        yield* displayYield();
      }),
    },
    { defaultOption: "r" }
  );
});

const GameLive = Layer.mergeAll(
  TownSquare.Default,
  Forest.Default,
  Mission.Default,
  Healer.Default,
  Inn.Default,
  Weaponsmith.Default,
  Armorsmith.Default,
  SaveGame.Default,
  Bank.Default,
  Player.Default,
  Display.Default
);

export const runGame = seqDiscard(
  Display.use((s) => s.clearScreen),
  gameSetup,
  game
).pipe(
  Effect.asVoid,
  Effect.provide(GameLive),
  Logger.withMinimumLogLevel(LogLevel.Debug)
);
