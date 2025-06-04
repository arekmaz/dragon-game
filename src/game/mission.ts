import { Effect } from "effect";
import { Display, k } from "./display.ts";
import { Player } from "./player.ts";
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
            makeOpponent: Effect.succeed({
              name: "Wolf",
              power: 3,
              maxHealth: 15,
              minLevel: 1,
            }),
            playerStarts: Effect.succeed(false),
          })
        ),
        r: seqDiscard(display("run")),
      })
    );

    const missions = [wolfMission];

    const randomMission: Effect.Effect<void, never, Player> = Effect.gen(
      function* () {
        yield* display`You are on a mission`;

        console.log({ next: yield* random.nextInt });
        console.log({ next: yield* random.nextInt });
        console.log({ next: yield* random.nextInt });
        console.log({ next: yield* random.nextInt });
        console.log({ next: yield* random.nextInt });
        console.log({ next: yield* random.nextInt });
        console.log({ next: yield* random.nextInt });
        console.log({ next: yield* random.nextInt });
      }
    );

    return {
      randomMission,
    };
  }),
  dependencies: [Display.Default],
}) {}
