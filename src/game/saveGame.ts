import { NodeFileSystem } from "@effect/platform-node";
import { NodeTerminal } from "@effect/platform-node";
import { FileSystem } from "@effect/platform";
import { Data, Effect, ParseResult, Ref, Schema } from "effect";
import { Bank } from "./bank.ts";
import { EqItemSchema, Player, PlayerData } from "./player.ts";
import { WeaponSchema } from "./weapons.ts";

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

export const JsonGameData = Schema.parseJson(
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
  dependencies: [
    NodeFileSystem.layer,
    Bank.Default,
    Player.Default,
    NodeTerminal.layer,
  ],
}) {}
