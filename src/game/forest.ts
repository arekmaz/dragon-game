import { Terminal } from "@effect/platform/Terminal";
import { Effect, Random, Ref } from "effect";
import { Display } from "./display.ts";
import { Player, PlayerDeadException, weapons } from "./player.ts";

export class Forest extends Effect.Service<Forest>()("Forest", {
  effect: Effect.gen(function* () {
    const { display, newLine, choice, clearScreen, displayYield } =
      yield* Display;

    const forestIntro = Effect.zipRight(
      display`You arrive at the deep dark forest`,
      newLine
    );

    const forestBackMsg = Effect.zipRight(
      display`You are back at the forest`,
      newLine
    );

    const forest: Effect.Effect<void, PlayerDeadException, Terminal | Player> =
      Effect.gen(function* () {
        yield* display`
    What do you do next?

    [L] look for something to kill
    [S] show stats
    [R] return to the town square`;

        yield* choice(
          {
            l: Effect.all([fight, forestBackMsg, forest]),
            s: Effect.all([Player.use((s) => s.stats), forest]),
            r: Effect.void,
          },
          { defaultOption: "s" }
        );
      });

    const fight: Effect.Effect<void, PlayerDeadException, Terminal | Player> =
      Effect.gen(function* () {
        const opponents: { name: string; power: number; maxHealth: number }[] =
          [
            { name: "Small Goblin", power: 2, maxHealth: 5 },
            { name: "Medium Goblin", power: 3, maxHealth: 7 },
            { name: "Big Goblin", power: 5, maxHealth: 10 },
          ];

        const randomOpponent = Random.nextIntBetween(0, opponents.length).pipe(
          Effect.map((i) => opponents[i])
        );

        const opponent = yield* randomOpponent;

        const opRef = yield* Ref.make(opponent.maxHealth);

        const intro = display`You meet ${opponent.name}, power ${
          opponent.power
        }, health: ${yield* opRef}/${opponent.maxHealth}`;

        const lvl = yield* Player.level;

        const playerStrike = Random.nextIntBetween(
          1,
          lvl * 3 + weapons[yield* Player.weapon]
        ).pipe(
          Effect.tap((dmg) => Ref.update(opRef, (h) => Math.max(h - dmg)))
        );

        const opStrike = Random.nextIntBetween(1, opponent.power).pipe(
          Effect.tap((dmg) => Player.decreaseHealth(dmg))
        );

        const opIsAlive = Effect.map(opRef, (h) => h > 0);

        const fightStats = Effect.gen(function* () {
          yield* display`
      ${yield* Player.name}: ${yield* Player.health}/${yield* Player.maxHealth}
      ${opponent.name}: ${yield* opRef}/${opponent.maxHealth}`;
        });

        yield* clearScreen;

        yield* intro;
        yield* newLine;

        yield* Random.nextBoolean.pipe(
          Effect.flatMap((playerStarts) =>
            playerStarts
              ? Effect.flatMap(
                  playerStrike,
                  (dmg) =>
                    display`You manage to strike it first, dealing ${dmg} damage`
                )
              : Effect.flatMap(
                  opStrike,
                  (dmg) => display`It suprises you, dealing you ${dmg} damage`
                )
          )
        );

        yield* newLine;

        yield* fightStats;

        yield* newLine;

        while ((yield* Player.isAlive) && (yield* opIsAlive)) {
          yield* display`
    What do you do next?
  [A] Attack
  [S] Stats
  [R] Run for your life`;

          yield* choice(
            {
              a: Effect.gen(function* () {
                const dmg = yield* playerStrike;
                yield* display`You strike ${opponent.name}, dealing ${dmg} damage.`;

                if (!(yield* opIsAlive)) {
                  return;
                }

                const opDmg = yield* opStrike;
                yield* display`${opponent.name}, strikes you back, dealing ${opDmg} damage.`;

                yield* newLine;

                yield* fightStats;
              }),

              s: fightStats,
              r: Random.nextIntBetween(3, 6).pipe(
                Effect.tap((lost) =>
                  Player.updateGold((g) => Math.max(0, g - lost))
                ),
                Effect.flatMap(
                  (lost) => display`You escape, losing ${lost} gold`
                )
              ),
            },
            { defaultOption: "s" }
          );

          yield* newLine;
        }

        if (!(yield* opIsAlive)) {
          const gainedExp = yield* Random.nextIntBetween(
            Math.round(opponent.maxHealth * 0.5),
            Math.round(opponent.maxHealth * 1.5)
          );
          const gainedGold = yield* Random.nextIntBetween(
            Math.round(opponent.power * 0.5),
            Math.round(opponent.power * 1.5)
          );

          const gainedLevels = yield* Player.addExp(gainedExp);
          yield* Player.updateGold((g) => g + gainedGold);
          yield* display`You killed ${opponent.name} gaining ${gainedExp} exp and ${gainedGold} gold`;
          if (gainedLevels > 0) {
            yield* display`You gained a new level: LEVEL ${yield* Player.level}`;
          }
          yield* newLine;
          yield* displayYield();
          yield* newLine;
        }
      });

    return {
      forestIntro,
      forestBackMsg,
      forest,
    };
  }),
  dependencies: [Display.Default],
}) {}
