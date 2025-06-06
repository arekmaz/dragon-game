import { Effect, Random } from "effect";
import { seqDiscard } from "../effectHelpers.ts";
import { Display } from "./display.ts";
import { fight, opponents } from "./fight.ts";
import { Mission } from "./mission.ts";
import { Player, PlayerDeadException } from "./player.ts";

export class Forest extends Effect.Service<Forest>()("Forest", {
  effect: Effect.gen(function* () {
    const { display, newLine, choice, clearScreen } = yield* Display;

    const mission = yield* Mission;

    const randomMission = Random.nextBoolean.pipe(
      Effect.flatMap((showMission) =>
        showMission ? mission.randomMission : Effect.void
      )
    );

    const intro = seqDiscard(
      display`You arrive at the deep dark forest`,
      newLine,
      randomMission
    );

    const forestBackMsg = seqDiscard(
      display`You are back at the forest`,
      newLine,
      randomMission
    );

    const randomOpponent = Effect.gen(function* () {
      const lvl = yield* Player.level;

      const opponentsMatchingPlayerLevel = opponents.filter(
        (o) => o.minLevel <= lvl
      );

      return yield* Effect.orDie(Random.choice(opponentsMatchingPlayerLevel));
    });

    const forest: Effect.Effect<void, PlayerDeadException, Player | Display> =
      Effect.gen(function* () {
        yield* display`
    What do you do next?

    [L] look for something to kill
    [S] show stats
    [R] return to the town square`;

        yield* choice(
          {
            l: seqDiscard(
              fight({
                makeOpponent: randomOpponent,
                playerStarts: Random.nextBoolean,
              }),
              clearScreen,
              forestBackMsg,
              forest
            ),
            s: seqDiscard(Player.stats, forest),
            r: Effect.void,
          },
          { defaultOption: "s" }
        );
      });

    return {
      intro,
      forestBackMsg,
      forest,
    };
  }),
  dependencies: [Display.Default],
}) {}
