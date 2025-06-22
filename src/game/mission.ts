import { Effect } from "effect";
import { Display, k } from "./display.ts";
import { Player } from "./player.ts";
import { DeterministicRandom } from "../DeterministicRandom.ts";
import { seqDiscard } from "../effectHelpers.ts";
import { FightService } from "./fight.ts";

export class Mission extends Effect.Service<Mission>()("Mission", {
  effect: Effect.gen(function* () {
    const { display, newLine, choice, displayYield } = yield* Display;

    const player = yield* Player;

    const random = yield* DeterministicRandom;

    const { fight } = yield* FightService;

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
              Effect.zip(player.dieOfPoison("mushroom"))
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
      player.rightHand.pipe(
        Effect.flatten,
        Effect.orElse(() => player.leftHand.pipe(Effect.flatten)),
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
              Effect.tap((gold) => player.updateGold((g) => g + gold))
            ),
          onFalse: () =>
            display`You got unlucky, the frog jumps away and steals ${k.red(
              "1 gold"
            )} from you`.pipe(
              Effect.zipRight(player.updateGold((g) => (g > 0 ? g - 1 : 0)))
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

    const randomMission = Effect.gen(function* () {
      yield* display`You are on a mission`;

      const mission = yield* random.choice(missions);

      return yield* mission;
    });

    return {
      randomMission,
    };
  }),
  dependencies: [
    Display.Default,
    Player.Default,
    FightService.Default,
    DeterministicRandom.Default,
  ],
}) {}
