import { Effect } from "effect";
import { Display } from "./display.ts";
import { Player } from "./player.ts";
import { DeterministicRandom } from "../DeterministicRandom.ts";

export class Mission extends Effect.Service<Mission>()("Mission", {
  effect: Effect.gen(function* () {
    const { display, newLine, choice, clearScreen, displayYield } =
      yield* Display;

    const random = yield* DeterministicRandom;

    const mission: Effect.Effect<void, never, Player> = Effect.gen(
      function* () {
        yield* display`You are on a mission`;

        const next = yield* random.nextInt;

        console.log({ next });
      }
    );

    return {
      mission,
    };
  }),
  dependencies: [Display.Default],
}) {}
