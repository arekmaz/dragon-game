import { Effect } from "effect";
import { Display, k } from "./display.ts";
import { Player, PlayerDeadException } from "./player.ts";
import { DeterministicRandom } from "../DeterministicRandom.ts";
import { seqDiscard } from "../effectHelpers.ts";
import { fight } from "./fight.ts";

type Node<AllKeys extends string, Self extends AllKeys> = {
  deps: Exclude<AllKeys, Self>[];
  run: (deps: Record<any, any>) => any;
};

type ExtractRunTypes<T> = {
  [K in keyof T]: T[K] extends { run: (...args: any[]) => infer R } ? R : never;
};

export function defineDepGraph<
  T extends {
    [K in keyof T]: {
      deps: Exclude<keyof T, K>[];
      run: (deps: {
        [D in T[K]["deps"][number]]: () => ExtractRunTypes<T[D]>;
      }) => any;
    };
  }
>(graph: T): T {
  return graph;
}

const steps = defineDepGraph({
  a: { deps: ["b"], run: (deps) => Effect.succeed(1) },
  b: { deps: ["a"], run: (deps) => Effect.succeed(2) },
});

export class Mission extends Effect.Service<Mission>()("Mission", {
  effect: Effect.gen(function* () {
    const { display, newLine, choice, clearScreen, displayYield } =
      yield* Display;

    const random = yield* DeterministicRandom;

    const mushroomMission = seqDiscard(
      displayYield(
        k.green(
          "There's a mushroom in your path, it looks very tasty, you eat it, you immediately want more"
        )
      ),
      newLine,
      random.nextBoolean.pipe(
        Effect.if({
          onTrue: () =>
            display`You got lucky, you found another one, the mushroom is very tasty, you become illuminated
          ...for 5 minutes`,
          onFalse: () =>
            display`You got unlucky, you feel sick and you die`.pipe(
              Effect.zip(Player.dieOfPoison("mushroom"))
            ),
        })
      )
    );

    const campfireMission = seqDiscard(
      displayYield(
        k.blue(
          "You arrived deep in the forest, it starts to rain, you stop and decide to set up a campfire"
        )
      ),
      newLine,
      displayYield(
        k.green(
          "You sit down and rest, you feel warm and comfortable next to a fire in a cave, you fall asleep"
        )
      ),
      newLine,
      Player.rightHand.pipe(
        Effect.flatten,
        Effect.orElse(() => Player.leftHand.pipe(Effect.flatten)),
        Effect.orElseSucceed(() => "hand"),
        Effect.tap((weapon) =>
          displayYield(
            `When you wake up, you can see that a tree is blocking the entrance to the cave, fortunately you have your trusty ${weapon} with you`
          )
        ),
        Effect.tap((weapon) =>
          newLine.pipe(
            Effect.zip(
              displayYield(k.green(`You strike the tree with ${weapon}`))
            ),
            Effect.repeat({ times: 9 })
          )
        ),
        Effect.tap(() =>
          displayYield(
            k.green("You cut the tree, you are free to exit the cave")
          )
        ),
        Effect.tap(() => newLine),
        Effect.tap(() => display`You're back in the forest`)
      )
    );

    const frogMission = seqDiscard(
      displayYield(
        k.green("There's a frog in your path, it wants to bring you luck")
      ),
      newLine,
      random.nextBoolean.pipe(
        Effect.if({
          onTrue: () =>
            random.nextIntBetween(1, 10).pipe(
              Effect.tap(
                (gold) =>
                  display`You got lucky, the frog jumps away and leaves behind ${k.yellow(
                    `${gold} gold`
                  )}`
              ),
              Effect.tap((gold) => Player.updateGold((g) => g + gold))
            ),
          onFalse: () =>
            display`You got unlucky, the frog jumps away and steals ${k.red(
              "1 gold"
            )} from you`.pipe(
              Effect.zipRight(Player.updateGold((g) => (g > 0 ? g - 1 : 0)))
            ),
        })
      )
    );

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

    const missions = [
      wolfMission,
      frogMission,
      mushroomMission,
      campfireMission,
    ];

    const randomMission: Effect.Effect<
      void,
      PlayerDeadException,
      Player | Display
    > = Effect.gen(function* () {
      yield* display`You are on a mission`;

      const mission = yield* random.choice(missions);

      return yield* mission;
    });

    return {
      randomMission,
    };
  }),
  dependencies: [Display.Default],
}) {}
