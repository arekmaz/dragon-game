import { Effect, Random, Ref } from "effect";
import {
  choice,
  clearScreen,
  display,
  displayYield,
  newLine,
} from "./display.ts";
import { stats } from "./player.ts";

export const forestIntro = Effect.zipRight(
  display`You arrive at the deep dark forest`,
  newLine
);

export const forestBackMsg = Effect.zipRight(
  display`You are back at the forest`,
  newLine
);

export const forest = Effect.fn("forest")(function* (): any {
  yield* display`
    What do you do next?

    [L] look for something to kill
    [S] show stats
    [R] return to the town square`;

  yield* choice({
    l: fight(),
    s: stats().pipe(Effect.zipRight(forest())),
    r: clearScreen.pipe(
      Effect.zipRight(townSquareIntro),
      Effect.zipRight(townSquare())
    ),
  })({ defaultOption: "s" });
});

const fight = Effect.fn("fight")(function* () {
  const opponents: { name: string; power: number; maxHealth: number }[] = [
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
  ).pipe(Effect.tap((dmg) => Ref.update(opRef, (h) => Math.max(h - dmg))));

  const opStrike = Random.nextIntBetween(1, opponent.power).pipe(
    Effect.tap((dmg) => Player.updateHealth((h) => Math.max(0, h - dmg)))
  );

  const opIsAlive = Effect.map(opRef, (h) => h > 0);

  const fightStats = Effect.gen(function* () {
    yield* display`
      ${yield* Player.name}: ${yield* Player.health}/${yield* Player.maxHealth}
      ${opponent.name}: ${yield* opRef}/${opponent.maxHealth}`;
  });
  const continueAfter = Effect.all([clearScreen, forestBackMsg, forest()]);

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

    yield* choice({
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
        Effect.tap((lost) => Player.updateGold((g) => Math.max(0, g - lost))),
        Effect.flatMap((lost) => display`You escape, losing ${lost} gold`),
        Effect.zipRight(continueAfter)
      ),
    })({ defaultOption: "s" });

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
  }

  yield* restartGameIfPlayerIsDead;

  yield* continueAfter;
});
