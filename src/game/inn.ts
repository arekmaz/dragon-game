import { Effect } from "effect";
import { Display, k } from "./display.ts";
import { Player } from "./player.ts";
import { SaveGame } from "../game.ts";

export class Inn extends Effect.Service<Inn>()("Inn", {
  effect: Effect.gen(function* () {
    const { display, newLine, choice, sunrise, bed } = yield* Display;
    const intro = display`Welcome to the Town's Inn, it's awfully crowded today`;

    const inn: Effect.Effect<void, never, Player | SaveGame> = Effect.gen(
      function* () {
        yield* newLine;
        yield* display`
    What do you do next?
  [L] get a room to sleep (save the game)
  [N] check town newsboard
  [S] show stats
  [R] return to the town square`;

        yield* choice(
          {
            l: Effect.all([
              newLine,
              display`you're very tired, you go to sleep early`,
              newLine,
              bed,
              newLine,
              Effect.sleep(500),
              display`saving the game...`,
              newLine,
              SaveGame.saveGame().pipe(
                Effect.matchEffect({
                  onFailure: (error) =>
                    display(k.red(`saving the game failed (${error.message})`)),
                  onSuccess: () => display`game saved...`,
                })
              ),
              newLine,
              Effect.sleep(1000),
              sunrise,
              newLine,
              display`you wake up quickly, adventure awaits...`,
              Effect.sleep(1000),
              inn,
            ]),
            n: display`news board`.pipe(Effect.zipRight(inn)),
            s: Player.stats.pipe(Effect.zipRight(inn)),
            r: Effect.void,
          },
          { defaultOption: "s" }
        );
      }
    );

    return {
      intro,
      inn,
    };
  }),
  dependencies: [Display.Default],
}) {}
