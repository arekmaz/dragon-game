import { Effect, Random } from "effect";
import { seqDiscard } from "../effectHelpers.ts";
import { Display } from "./display.ts";
import { FightService, opponents } from "./fight.ts";
import { Mission } from "./mission.ts";
import {
  Player,
  PlayerDeadDamageException,
  PlayerDeadPoisonException,
} from "./player.ts";

export class Forest extends Effect.Service<Forest>()("Forest", {
  effect: Effect.gen(function* () {
    const { display, newLine, choice, clearScreen } = yield* Display;

    const mission = yield* Mission;
    const player = yield* Player;

    const { fight } = yield* FightService;

    const randomMission = Random.choice([
      mission.randomMission,
      Effect.void,
      Effect.void,
      Effect.void,
    ]).pipe(Effect.orDie, Effect.flatten);

    const intro = seqDiscard(
      display`You arrive at the deep dark forest`,
      newLine,
      randomMission
    );

    const forestBackMsg = seqDiscard(
      display`You are back at the forest`,
      newLine
    );

    const randomOpponent = Effect.gen(function* () {
      const lvl = yield* player.level;

      const opponentsMatchingPlayerLevel = opponents.filter(
        (o) => o.minLevel <= lvl
      );

      return yield* Random.choice(opponentsMatchingPlayerLevel).pipe(
        Effect.orDie
      );
    });

    const forest: Effect.Effect<
      void,
      PlayerDeadDamageException | PlayerDeadPoisonException,
      never
    > = Effect.gen(function* () {
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
          s: seqDiscard(player.stats, forest),
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
  dependencies: [
    Display.Default,
    Mission.Default,
    Player.Default,
    FightService.Default,
  ],
}) {}
