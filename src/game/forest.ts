import { Terminal } from "@effect/platform/Terminal";
import { Effect, Random, Ref } from "effect";
import { Display, k } from "./display.ts";
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

    const fight = Effect.gen(function* () {
      const randomOpponent = Random.nextIntBetween(0, opponents.length).pipe(
        Effect.map((i) => opponents[i])
      );

      const opponent = yield* randomOpponent;

      const opRef = yield* Ref.make(opponent.maxHealth);

      const intro = display`You meet ${k.red(opponent.name)}, power ${
        opponent.power
      }, health: ${yield* opRef}/${opponent.maxHealth}`;

      const lvl = yield* Player.level;

      const playerStrike = Random.nextIntBetween(
        1,
        lvl * 3 + weapons[yield* Player.weapon]
      ).pipe(Effect.tap((dmg) => Ref.update(opRef, (h) => Math.max(h - dmg))));

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
                  display`You manage to strike it first, dealing ${k.red(
                    dmg
                  )} damage`
              )
            : opStrike.pipe(
                Effect.flatMap(
                  (dmg) =>
                    display`It suprises you, dealing you ${k.red(dmg)} damage`
                ),
                Effect.catchAll(
                  (e) =>
                    display`It suprises you, dealing you ${k.red(
                      e.amount
                    )} damage, killing you`
                )
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

              yield* newLine;

              yield* display`You strike ${k.red(
                opponent.name
              )}, dealing ${k.red(dmg)} damage.`;

              if (!(yield* opIsAlive)) {
                return;
              }

              const opDmg = yield* opStrike;
              yield* display`${k.red(
                opponent.name
              )}, strikes you back, dealing ${k.red(opDmg)} damage.`;

              yield* newLine;

              yield* fightStats;
            }),

            s: fightStats,
            r: Random.nextIntBetween(3, 6).pipe(
              Effect.tap((lost) =>
                Player.updateGold((g) => Math.max(0, g - lost))
              ),
              Effect.flatMap(
                (lost) => display`You escape, losing ${k.red(lost)} gold`
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
          yield* display`You gained a new level: LEVEL ${k
            .bold()
            .yellow(yield* Player.level)}`;
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

const opponents: { name: string; power: number; maxHealth: number }[] = [
  { name: "Small Goblin", power: 2, maxHealth: 5 },
  { name: "Medium Goblin", power: 3, maxHealth: 7 },
  { name: "Big Goblin", power: 5, maxHealth: 10 },
  { name: "Goblin Warrior", power: 7, maxHealth: 15 },
  { name: "Goblin Champion", power: 10, maxHealth: 20 },
  { name: "Forest Troll", power: 12, maxHealth: 25 },
  { name: "Mountain Troll", power: 15, maxHealth: 30 },
  { name: "Ancient Troll", power: 18, maxHealth: 35 },
  { name: "Forest Ogre", power: 20, maxHealth: 40 },
  { name: "Mountain Ogre", power: 25, maxHealth: 50 },
  { name: "Ancient Ogre", power: 30, maxHealth: 60 },
  { name: "Young Dragon", power: 35, maxHealth: 70 },
  { name: "Adult Dragon", power: 40, maxHealth: 80 },
  { name: "Elder Dragon", power: 45, maxHealth: 90 },
  { name: "Ancient Dragon", power: 50, maxHealth: 100 },
  { name: "Dragon Lord", power: 60, maxHealth: 120 },
  { name: "Dragon King", power: 70, maxHealth: 140 },
  { name: "Dragon Emperor", power: 80, maxHealth: 160 },
  { name: "Dragon God", power: 90, maxHealth: 180 },
  { name: "Primordial Dragon", power: 100, maxHealth: 200 },
  { name: "Cosmic Dragon", power: 120, maxHealth: 240 },
  { name: "Eternal Dragon", power: 140, maxHealth: 280 },
  { name: "Infinite Dragon", power: 160, maxHealth: 320 },
  { name: "Celestial Dragon", power: 200, maxHealth: 400 },
  { name: "Astral Dragon", power: 240, maxHealth: 480 },
  { name: "Nebula Dragon", power: 280, maxHealth: 560 },
  { name: "Void Dragon", power: 320, maxHealth: 640 },
  { name: "Abyssal Dragon", power: 360, maxHealth: 720 },
  { name: "Elder Titan", power: 400, maxHealth: 800 },
  { name: "Ancient Titan", power: 450, maxHealth: 900 },
  { name: "Primordial Titan", power: 500, maxHealth: 1000 },
  { name: "Celestial Titan", power: 600, maxHealth: 1200 },
  { name: "Astral Titan", power: 700, maxHealth: 1400 },
  { name: "Cosmic Titan", power: 800, maxHealth: 1600 },
  { name: "Void Titan", power: 900, maxHealth: 1800 },
  { name: "Abyssal Titan", power: 1000, maxHealth: 2000 },
  { name: "Elder God", power: 1200, maxHealth: 2400 },
  { name: "Ancient God", power: 1400, maxHealth: 2800 },
  { name: "Primordial God", power: 1600, maxHealth: 3200 },
  { name: "Celestial God", power: 1800, maxHealth: 3600 },
  { name: "Astral God", power: 2000, maxHealth: 4000 },
  { name: "Cosmic God", power: 2400, maxHealth: 4800 },
  { name: "Void God", power: 2800, maxHealth: 5600 },
  { name: "Abyssal God", power: 3200, maxHealth: 6400 },
  { name: "Elder Deity", power: 3600, maxHealth: 7200 },
  { name: "Ancient Deity", power: 4000, maxHealth: 8000 },
  { name: "Primordial Deity", power: 4500, maxHealth: 9000 },
  { name: "Celestial Deity", power: 5000, maxHealth: 10000 },
  { name: "Astral Deity", power: 6000, maxHealth: 12000 },
  { name: "Cosmic Deity", power: 7000, maxHealth: 14000 },
  { name: "Void Deity", power: 8000, maxHealth: 16000 },
  { name: "Abyssal Deity", power: 9000, maxHealth: 18000 },
  { name: "Elder Creator", power: 10000, maxHealth: 20000 },
  { name: "Ancient Creator", power: 12000, maxHealth: 24000 },
  { name: "Primordial Creator", power: 14000, maxHealth: 28000 },
  { name: "Celestial Creator", power: 16000, maxHealth: 32000 },
  { name: "Astral Creator", power: 18000, maxHealth: 36000 },
  { name: "Cosmic Creator", power: 20000, maxHealth: 40000 },
  { name: "Void Creator", power: 24000, maxHealth: 48000 },
  { name: "Abyssal Creator", power: 28000, maxHealth: 56000 },
  { name: "Elder Architect", power: 32000, maxHealth: 64000 },
  { name: "Ancient Architect", power: 36000, maxHealth: 72000 },
  { name: "Primordial Architect", power: 40000, maxHealth: 80000 },
  { name: "Celestial Architect", power: 45000, maxHealth: 90000 },
  { name: "Astral Architect", power: 50000, maxHealth: 100000 },
  { name: "Cosmic Architect", power: 60000, maxHealth: 120000 },
  { name: "Void Architect", power: 70000, maxHealth: 140000 },
  { name: "Abyssal Architect", power: 80000, maxHealth: 160000 },
  { name: "Elder Sovereign", power: 90000, maxHealth: 180000 },
  { name: "Ancient Sovereign", power: 100000, maxHealth: 200000 },
  { name: "Primordial Sovereign", power: 120000, maxHealth: 240000 },
  { name: "Celestial Sovereign", power: 140000, maxHealth: 280000 },
  { name: "Astral Sovereign", power: 160000, maxHealth: 320000 },
  { name: "Cosmic Sovereign", power: 180000, maxHealth: 360000 },
  { name: "Void Sovereign", power: 200000, maxHealth: 400000 },
  { name: "Abyssal Sovereign", power: 240000, maxHealth: 480000 },
  { name: "Elder Absolute", power: 280000, maxHealth: 560000 },
  { name: "Ancient Absolute", power: 320000, maxHealth: 640000 },
  { name: "Primordial Absolute", power: 360000, maxHealth: 720000 },
  { name: "Celestial Absolute", power: 400000, maxHealth: 800000 },
  { name: "Astral Absolute", power: 450000, maxHealth: 900000 },
  { name: "Cosmic Absolute", power: 500000, maxHealth: 1000000 },
  { name: "Void Absolute", power: 600000, maxHealth: 1200000 },
  { name: "Abyssal Absolute", power: 700000, maxHealth: 1400000 },
  { name: "Elder Omniscient", power: 800000, maxHealth: 1600000 },
  { name: "Ancient Omniscient", power: 900000, maxHealth: 1800000 },
  {
    name: "Primordial Omniscient",
    power: 1000000,
    maxHealth: 2000000,
  },
  {
    name: "Celestial Omniscient",
    power: 1200000,
    maxHealth: 2400000,
  },
  { name: "Astral Omniscient", power: 1400000, maxHealth: 2800000 },
  { name: "Cosmic Omniscient", power: 1600000, maxHealth: 3200000 },
  { name: "Void Omniscient", power: 1800000, maxHealth: 3600000 },
  { name: "Abyssal Omniscient", power: 2000000, maxHealth: 4000000 },
];
