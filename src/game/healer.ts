import { Terminal } from "@effect/platform";
import { Effect, Ref, Schema } from "effect";
import { Display } from "./display.ts";
import { Player } from "./player.ts";
import { NodeTerminal } from "@effect/platform-node";

export class Healer extends Effect.Service<Healer>()("Healer", {
  effect: Effect.gen(function* () {
    const terminal = yield* Terminal.Terminal;
    const { display, newLine, choice } = yield* Display;

    const healer: Effect.Effect<void, never, Player> = Effect.gen(function* () {
      const playerMaxHealth = yield* Player.getMaxHealth;

      const healFull = Player.pipe(
        Effect.flatMap(({ data }) =>
          Ref.modify(data, (data) => {
            const healthToRestore = playerMaxHealth - data.health;

            if (data.gold >= healthToRestore * healthPointCost) {
              const cost = healthToRestore * healthPointCost;
              return [
                {
                  restoredHealth: healthToRestore,
                  cost,
                },
                { ...data, health: playerMaxHealth, gold: data.gold - cost },
              ];
            }

            const maxHealthRestorable = Math.floor(data.gold / healthPointCost);
            const cost = maxHealthRestorable * healthPointCost;

            return [
              {
                restoredHealth: maxHealthRestorable,
                cost,
              },
              { ...data, health: playerMaxHealth, gold: data.gold - cost },
            ];
          })
        )
      );

      const healSpecified = Effect.gen(function* () {
        const data = yield* Player.data;

        const maxPointsAffordable = Math.min(
          Math.floor(data.gold / healthPointCost),
          playerMaxHealth - data.health
        );

        yield* display`Enter the amount of health points (you can restore max ${maxPointsAffordable} points):`;

        const readAmount: Effect.Effect<number, never, never> =
          terminal.readLine.pipe(
            Effect.flatMap(
              Schema.decode(
                Schema.NumberFromString.pipe(
                  Schema.int(),
                  Schema.between(0, maxPointsAffordable)
                )
              )
            ),
            Effect.tapError(
              () =>
                display`Incorrect amount, enter a number between 0-${maxPointsAffordable}`
            ),
            Effect.orElse(() => readAmount)
          );

        const healthToRestore = yield* readAmount;
        const cost = healthToRestore * healthPointCost;

        yield* Player.updateGold((g) => g - cost);
        yield* Player.increaseHealth(healthToRestore);

        return { restoredHealth: healthToRestore, cost };
      });

      yield* newLine;
      yield* display`
  [H] heal as much as possible with your gold
  [A] heal a speficied amount of points
  [S] show stats
  [R] return to the town square`;

      yield* choice(
        {
          h: healFull.pipe(
            Effect.tap(
              ({ cost, restoredHealth }) =>
                display`Restored ${restoredHealth} health, ${cost} gold paid`
            ),
            Effect.zipRight(newLine),
            Effect.zipRight(healer)
          ),
          a: healSpecified.pipe(
            Effect.tap(
              ({ cost, restoredHealth }) =>
                display`Restored ${restoredHealth} health, ${cost} gold paid`
            ),
            Effect.zipRight(newLine),
            Effect.zipRight(healer)
          ),
          s: Player.stats.pipe(Effect.zipRight(healer)),
          r: Effect.void,
        },
        { defaultOption: "s" }
      );
    });

    const intro = display`Welcome to the healer's office, he'll service you right away
The cost is ${healthPointCost} gold for every 1 point of health restored

What do you need?
  `;

    return {
      intro,
      healer,
    };
  }),
  dependencies: [Display.Default, NodeTerminal.layer],
}) {}

export const healthPointCost = 5;
