import { Effect } from "effect";
import { Display, k } from "./display.ts";
import { Player } from "./player.ts";
import { SaveGame } from "../SaveGame.ts";
import { seqDiscard } from "../effectHelpers.ts";

export class Inn extends Effect.Service<Inn>()("Inn", {
  effect: Effect.gen(function* () {
    const { display, newLine, choice, sunrise, bed } = yield* Display;
    const intro = display`Welcome to the Town's Inn, it's awfully crowded today`;

    const saveGame = yield* SaveGame;
    const player = yield* Player;

    const inn: Effect.Effect<void, never, never> = Effect.gen(function* () {
      yield* newLine;
      yield* display`
    What do you do next?
  [L] get a room to sleep (save the game)
  [N] check town newsboard
  [S] show stats
  [R] return to the town square`;

      yield* choice(
        {
          l: seqDiscard(
            newLine,
            display`you're very tired, you go to sleep early`,
            newLine,
            bed,
            newLine,
            Effect.sleep(500),
            display`saving the game...`,
            newLine,
            saveGame.saveGame().pipe(
              Effect.tapError(Effect.logDebug),
              Effect.matchEffect({
                onFailure: () => display(k.red(`saving the game failed`)),
                onSuccess: () => display`game saved...`,
              })
            ),
            newLine,
            Effect.sleep(1000),
            sunrise,
            newLine,
            display`you wake up quickly, adventure awaits...`,
            Effect.sleep(1000),
            inn
          ),
          n: display`news board`.pipe(Effect.zipRight(inn)),
          s: player.stats.pipe(Effect.zipRight(inn)),
          r: Effect.void,
        },
        { defaultOption: "s" }
      );
    });

    return {
      intro,
      inn,
    };
  }),
  dependencies: [Display.Default, SaveGame.Default, Player.Default],
}) {}
