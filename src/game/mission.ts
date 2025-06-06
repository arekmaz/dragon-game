import { Effect } from "effect";
import { Display, k } from "./display.ts";
import { Player, PlayerDeadException } from "./player.ts";
import { DeterministicRandom } from "../DeterministicRandom.ts";
import { seqDiscard } from "../effectHelpers.ts";
import { fight } from "./fight.ts";

export class Mission extends Effect.Service<Mission>()("Mission", {
  effect: Effect.gen(function* () {
    const { display, newLine, choice, clearScreen, displayYield } =
      yield* Display;

    const random = yield* DeterministicRandom;

    const wolfMission = seqDiscard(
      displayYield(k.red("There's a wolf in your path, it looks very hungry")),
      newLine,
      display(k.yellow("What do you do?")),
      newLine,
      display`
      [A] Attack
      [R] Run
      `,
      choice({
        a: seqDiscard(
          fight({
            makeOpponent: Effect.all({
              power: random.nextIntBetween(1, 10),
              maxHealth: random.nextIntBetween(1, 10),
            }).pipe(
              Effect.map((stats) => ({
                name: "Wolf",
                minLevel: 1,
                ...stats,
              }))
            ),
            playerStarts: Effect.succeed(false),
          })
        ),
        r: seqDiscard(display("run")),
      })
    );

    const missions = [wolfMission];

    const randomMission: Effect.Effect<
      void,
      PlayerDeadException,
      Player | Display
    > = Effect.gen(function* () {
      yield* display`You are on a mission`;

      console.log({ next: yield* random.nextInt });
      console.log({ next: yield* random.nextInt });
      console.log({ next: yield* random.nextInt });
      console.log({ next: yield* random.nextInt });
      console.log({ next: yield* random.nextInt });
      console.log({ next: yield* random.nextInt });
      console.log({ next: yield* random.nextInt });
      console.log({ next: yield* random.nextInt });

      const mission = yield* random.choice(missions);

      return yield* mission;
    });

    return {
      randomMission,
    };
  }),
  dependencies: [Display.Default],
}) {}
