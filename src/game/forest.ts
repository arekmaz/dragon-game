import { Effect, Random, Ref, Option } from "effect";
import { Display, k } from "./display.ts";
import { Player, PlayerDeadException } from "./player.ts";
import { weapons } from "./weaponsmith.ts";
import { seqDiscard } from "../effectHelpers.ts";
import { Mission } from "./mission.ts";

export class Forest extends Effect.Service<Forest>()("Forest", {
  effect: Effect.gen(function* () {
    const { display, newLine, choice, clearScreen, displayYield } =
      yield* Display;

    const mission = yield* Mission;

    const fight = <R, R1>({
      makeOpponent,
      playerStarts,
    }: {
      makeOpponent: Effect.Effect<Opponent, never, R>;
      playerStarts: Effect.Effect<boolean, never, R1>;
    }) =>
      Effect.gen(function* () {
        const opponent = yield* makeOpponent;

        const lvl = yield* Player.level;

        const opRef = yield* Ref.make(opponent.maxHealth);

        const intro = display`You meet ${k.red(opponent.name)}, power ${
          opponent.power
        }, health: ${yield* opRef}/${opponent.maxHealth}`;

        const rightHandWeapon = yield* Player.rightHand;
        const leftHandWeapon = yield* Player.leftHand;

        const playerStrike = Random.nextIntBetween(
          1,
          lvl * 3 +
            (Option.isSome(rightHandWeapon)
              ? weapons[rightHandWeapon.value]
              : 0) +
            (Option.isSome(leftHandWeapon) ? weapons[leftHandWeapon.value] : 0)
        ).pipe(
          Effect.tap((dmg) => Ref.update(opRef, (h) => Math.max(h - dmg)))
        );

        const opStrike = Random.nextIntBetween(1, opponent.power).pipe(
          Effect.tap((dmg) => Player.decreaseHealth(dmg))
        );

        const opIsAlive = Effect.map(opRef, (h) => h > 0);

        const fightStats = Effect.gen(function* () {
          yield* display`
      ${yield* Player.displayName}: ${yield* Player.health}/${yield* Player.getMaxHealth}
      ${k.red(opponent.name)}: ${yield* opRef}/${opponent.maxHealth}`;
        });

        yield* clearScreen;

        yield* intro;
        yield* newLine;

        yield* playerStarts.pipe(
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
                  Effect.tapError(
                    (e) =>
                      display`It suprises you, dealing you ${k.red(
                        e.amount
                      )} damage and killing you.`
                  )
                )
          )
        );

        yield* newLine;

        yield* fightStats;

        yield* newLine;

        const move: Effect.Effect<void, PlayerDeadException, Player> =
          Effect.gen(function* () {
            yield* display`
    What do you do next?
  [A] Attack
  [S] Stats
  [R] Run for your life`;

            const attack = Effect.gen(function* () {
              const dmg = yield* playerStrike;

              yield* newLine;

              yield* display`You strike ${k.red(
                opponent.name
              )}, dealing ${k.red(dmg)} damage.`;

              if (yield* opIsAlive) {
                const opDmg = yield* opStrike.pipe(
                  Effect.tapError(
                    (e) =>
                      display`${k.red(
                        opponent.name
                      )}, strikes you back, dealing ${k.red(
                        e.amount
                      )} damage and killing you.`
                  )
                );

                yield* display`${k.red(
                  opponent.name
                )}, strikes you back, dealing ${k.red(opDmg)} damage.`;

                yield* newLine;

                yield* fightStats;

                yield* move;
                return;
              }

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

              yield* display`You killed ${k.red(
                opponent.name
              )} gaining ${gainedExp} exp and ${gainedGold} gold`;
              if (gainedLevels > 0) {
                yield* display`You gained a new level: ${k
                  .bold()
                  .yellow("LEVEL " + String(yield* Player.level))}`;
              }

              yield* newLine;
              yield* displayYield();
              yield* newLine;
            });

            yield* choice(
              {
                a: attack,

                s: seqDiscard(fightStats, move),

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
          });

        if (yield* opIsAlive) {
          yield* move;
        }
      });

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

    const randomMission = mission.mission;
    // Random.nextBoolean.pipe(
    //   Effect.flatMap((showMission) =>
    //     showMission
    //       ? Random.choice(missions).pipe(
    //           Effect.orDie,
    //           Effect.flatMap((effect) => effect)
    //         )
    //       : Effect.void
    //   )
    // );

    const intro = seqDiscard(
      display`You arrive at the deep dark forest`,
      newLine,
      randomMission
    );

    const forestBackMsg = seqDiscard(
      display`You are back at the forest`,
      newLine,
      randomMission
    );

    const randomOpponent = Effect.gen(function* () {
      const lvl = yield* Player.level;

      const opponentsMatchingPlayerLevel = opponents.filter(
        (o) => o.minLevel <= lvl
      );

      return yield* Effect.orDie(Random.choice(opponentsMatchingPlayerLevel));
    });

    const forest: Effect.Effect<void, PlayerDeadException, Player> = Effect.gen(
      function* () {
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
            s: seqDiscard(Player.stats, forest),
            r: Effect.void,
          },
          { defaultOption: "s" }
        );
      }
    );

    return {
      intro,
      forestBackMsg,
      forest,
    };
  }),
  dependencies: [Display.Default],
}) {}

type Opponent = {
  name: string;
  power: number;
  maxHealth: number;
  minLevel: number;
};

const opponents: Opponent[] = [
  // Level 1-5: Early Game
  { name: "Small Goblin", power: 2, maxHealth: 5, minLevel: 1 },
  { name: "Goblin Scout", power: 2, maxHealth: 6, minLevel: 1 },
  { name: "Goblin Thief", power: 3, maxHealth: 5, minLevel: 1 },
  { name: "Goblin Runner", power: 2, maxHealth: 7, minLevel: 1 },
  { name: "Goblin Shaman", power: 3, maxHealth: 6, minLevel: 1 },
  { name: "Medium Goblin", power: 3, maxHealth: 7, minLevel: 1 },
  { name: "Goblin Archer", power: 4, maxHealth: 6, minLevel: 1 },
  { name: "Goblin Spearman", power: 3, maxHealth: 8, minLevel: 1 },
  { name: "Goblin Brute", power: 4, maxHealth: 7, minLevel: 1 },
  { name: "Goblin Hunter", power: 3, maxHealth: 9, minLevel: 1 },
  { name: "Big Goblin", power: 5, maxHealth: 10, minLevel: 1 },
  { name: "Goblin Berserker", power: 6, maxHealth: 9, minLevel: 1 },
  { name: "Goblin Guard", power: 5, maxHealth: 11, minLevel: 1 },
  { name: "Goblin Raider", power: 6, maxHealth: 10, minLevel: 1 },
  { name: "Goblin Shaman", power: 5, maxHealth: 12, minLevel: 1 },
  { name: "Goblin Warrior", power: 7, maxHealth: 15, minLevel: 2 },
  { name: "Goblin Elite", power: 8, maxHealth: 14, minLevel: 2 },
  { name: "Goblin Captain", power: 7, maxHealth: 16, minLevel: 2 },
  { name: "Goblin Warlock", power: 8, maxHealth: 15, minLevel: 2 },
  { name: "Goblin Knight", power: 9, maxHealth: 14, minLevel: 2 },
  { name: "Goblin Champion", power: 10, maxHealth: 20, minLevel: 3 },
  { name: "Goblin Warchief", power: 11, maxHealth: 19, minLevel: 3 },
  { name: "Goblin Overlord", power: 10, maxHealth: 21, minLevel: 3 },
  { name: "Goblin Archmage", power: 11, maxHealth: 20, minLevel: 3 },
  { name: "Goblin King", power: 12, maxHealth: 19, minLevel: 3 },

  // Level 4-10: Early Mid Game
  { name: "Forest Troll", power: 12, maxHealth: 25, minLevel: 4 },
  { name: "Troll Scout", power: 13, maxHealth: 24, minLevel: 4 },
  { name: "Troll Shaman", power: 12, maxHealth: 26, minLevel: 4 },
  { name: "Troll Brute", power: 13, maxHealth: 25, minLevel: 4 },
  { name: "Troll Hunter", power: 14, maxHealth: 24, minLevel: 4 },
  { name: "Mountain Troll", power: 15, maxHealth: 30, minLevel: 5 },
  { name: "Troll Warrior", power: 16, maxHealth: 29, minLevel: 5 },
  { name: "Troll Berserker", power: 15, maxHealth: 31, minLevel: 5 },
  { name: "Troll Warlock", power: 16, maxHealth: 30, minLevel: 5 },
  { name: "Troll Champion", power: 17, maxHealth: 29, minLevel: 5 },
  { name: "Ancient Troll", power: 18, maxHealth: 35, minLevel: 6 },
  { name: "Troll Chieftain", power: 19, maxHealth: 34, minLevel: 6 },
  { name: "Troll Overlord", power: 18, maxHealth: 36, minLevel: 6 },
  { name: "Troll Archmage", power: 19, maxHealth: 35, minLevel: 6 },
  { name: "Troll King", power: 20, maxHealth: 34, minLevel: 6 },
  { name: "Forest Ogre", power: 20, maxHealth: 40, minLevel: 7 },
  { name: "Ogre Scout", power: 21, maxHealth: 39, minLevel: 7 },
  { name: "Ogre Shaman", power: 20, maxHealth: 41, minLevel: 7 },
  { name: "Ogre Brute", power: 21, maxHealth: 40, minLevel: 7 },
  { name: "Ogre Hunter", power: 22, maxHealth: 39, minLevel: 7 },
  { name: "Mountain Ogre", power: 25, maxHealth: 50, minLevel: 8 },
  { name: "Ogre Warrior", power: 26, maxHealth: 49, minLevel: 8 },
  { name: "Ogre Berserker", power: 25, maxHealth: 51, minLevel: 8 },
  { name: "Ogre Warlock", power: 26, maxHealth: 50, minLevel: 8 },
  { name: "Ogre Champion", power: 27, maxHealth: 49, minLevel: 8 },
  { name: "Ancient Ogre", power: 30, maxHealth: 60, minLevel: 10 },
  { name: "Ogre Chieftain", power: 31, maxHealth: 59, minLevel: 10 },
  { name: "Ogre Overlord", power: 30, maxHealth: 61, minLevel: 10 },
  { name: "Ogre Archmage", power: 31, maxHealth: 60, minLevel: 10 },
  { name: "Ogre King", power: 32, maxHealth: 59, minLevel: 10 },

  // Level 10-20: Mid Game
  { name: "Young Dragon", power: 35, maxHealth: 70, minLevel: 12 },
  { name: "Adult Dragon", power: 40, maxHealth: 80, minLevel: 14 },
  { name: "Elder Dragon", power: 45, maxHealth: 90, minLevel: 16 },
  { name: "Ancient Dragon", power: 50, maxHealth: 100, minLevel: 18 },
  { name: "Dragon Lord", power: 60, maxHealth: 120, minLevel: 20 },

  // Level 20-30: Late Mid Game
  { name: "Dragon King", power: 70, maxHealth: 140, minLevel: 22 },
  { name: "Dragon Emperor", power: 80, maxHealth: 160, minLevel: 24 },
  { name: "Dragon God", power: 90, maxHealth: 180, minLevel: 26 },
  { name: "Primordial Dragon", power: 100, maxHealth: 200, minLevel: 28 },
  { name: "Cosmic Dragon", power: 120, maxHealth: 240, minLevel: 30 },

  // Level 30-40: Late Game
  { name: "Eternal Dragon", power: 140, maxHealth: 280, minLevel: 32 },
  { name: "Infinite Dragon", power: 160, maxHealth: 320, minLevel: 34 },
  { name: "Celestial Dragon", power: 200, maxHealth: 400, minLevel: 36 },
  { name: "Astral Dragon", power: 240, maxHealth: 480, minLevel: 38 },
  { name: "Nebula Dragon", power: 280, maxHealth: 560, minLevel: 40 },

  // Level 40-50: End Game
  { name: "Void Dragon", power: 320, maxHealth: 640, minLevel: 42 },
  { name: "Abyssal Dragon", power: 360, maxHealth: 720, minLevel: 44 },
  { name: "Elder Titan", power: 400, maxHealth: 800, minLevel: 46 },
  { name: "Ancient Titan", power: 450, maxHealth: 900, minLevel: 48 },
  { name: "Primordial Titan", power: 500, maxHealth: 1000, minLevel: 50 },

  // Level 50-60: Post Game
  { name: "Celestial Titan", power: 600, maxHealth: 1200, minLevel: 52 },
  { name: "Astral Titan", power: 700, maxHealth: 1400, minLevel: 54 },
  { name: "Cosmic Titan", power: 800, maxHealth: 1600, minLevel: 56 },
  { name: "Void Titan", power: 900, maxHealth: 1800, minLevel: 58 },
  { name: "Abyssal Titan", power: 1000, maxHealth: 2000, minLevel: 60 },

  // Level 60-70: Super End Game
  { name: "Elder God", power: 1200, maxHealth: 2400, minLevel: 62 },
  { name: "Ancient God", power: 1400, maxHealth: 2800, minLevel: 64 },
  { name: "Primordial God", power: 1600, maxHealth: 3200, minLevel: 66 },
  { name: "Celestial God", power: 1800, maxHealth: 3600, minLevel: 68 },
  { name: "Astral God", power: 2000, maxHealth: 4000, minLevel: 70 },

  // Level 70-80: Ultra End Game
  { name: "Cosmic God", power: 2400, maxHealth: 4800, minLevel: 72 },
  { name: "Void God", power: 2800, maxHealth: 5600, minLevel: 74 },
  { name: "Abyssal God", power: 3200, maxHealth: 6400, minLevel: 76 },
  { name: "Elder Deity", power: 3600, maxHealth: 7200, minLevel: 78 },
  { name: "Ancient Deity", power: 4000, maxHealth: 8000, minLevel: 80 },

  // Level 80-90: Mythic End Game
  { name: "Primordial Deity", power: 4500, maxHealth: 9000, minLevel: 82 },
  { name: "Celestial Deity", power: 5000, maxHealth: 10000, minLevel: 84 },
  { name: "Astral Deity", power: 6000, maxHealth: 12000, minLevel: 86 },
  { name: "Cosmic Deity", power: 7000, maxHealth: 14000, minLevel: 88 },
  { name: "Void Deity", power: 8000, maxHealth: 16000, minLevel: 90 },

  // Level 90-100: Legendary End Game
  { name: "Abyssal Deity", power: 9000, maxHealth: 18000, minLevel: 92 },
  { name: "Elder Creator", power: 10000, maxHealth: 20000, minLevel: 94 },
  { name: "Ancient Creator", power: 12000, maxHealth: 24000, minLevel: 96 },
  { name: "Primordial Creator", power: 14000, maxHealth: 28000, minLevel: 98 },
  { name: "Celestial Creator", power: 16000, maxHealth: 32000, minLevel: 100 },

  // Level 100+: Ultimate End Game
  { name: "Astral Creator", power: 18000, maxHealth: 36000, minLevel: 102 },
  { name: "Cosmic Creator", power: 20000, maxHealth: 40000, minLevel: 104 },
  { name: "Void Creator", power: 24000, maxHealth: 48000, minLevel: 106 },
  { name: "Abyssal Creator", power: 28000, maxHealth: 56000, minLevel: 108 },
  { name: "Elder Architect", power: 32000, maxHealth: 64000, minLevel: 110 },

  // Level 110+: Transcendent End Game
  { name: "Ancient Architect", power: 36000, maxHealth: 72000, minLevel: 112 },
  {
    name: "Primordial Architect",
    power: 40000,
    maxHealth: 80000,
    minLevel: 114,
  },
  {
    name: "Celestial Architect",
    power: 45000,
    maxHealth: 90000,
    minLevel: 116,
  },
  { name: "Astral Architect", power: 50000, maxHealth: 100000, minLevel: 118 },
  { name: "Cosmic Architect", power: 60000, maxHealth: 120000, minLevel: 120 },

  // Level 120+: Divine End Game
  { name: "Void Architect", power: 70000, maxHealth: 140000, minLevel: 122 },
  { name: "Abyssal Architect", power: 80000, maxHealth: 160000, minLevel: 124 },
  { name: "Elder Sovereign", power: 90000, maxHealth: 180000, minLevel: 126 },
  {
    name: "Ancient Sovereign",
    power: 100000,
    maxHealth: 200000,
    minLevel: 128,
  },
  {
    name: "Primordial Sovereign",
    power: 120000,
    maxHealth: 240000,
    minLevel: 130,
  },

  // Level 130+: Celestial End Game
  {
    name: "Celestial Sovereign",
    power: 140000,
    maxHealth: 280000,
    minLevel: 132,
  },
  { name: "Astral Sovereign", power: 160000, maxHealth: 320000, minLevel: 134 },
  { name: "Cosmic Sovereign", power: 180000, maxHealth: 360000, minLevel: 136 },
  { name: "Void Sovereign", power: 200000, maxHealth: 400000, minLevel: 138 },
  {
    name: "Abyssal Sovereign",
    power: 240000,
    maxHealth: 480000,
    minLevel: 140,
  },

  // Level 140+: Eternal End Game
  { name: "Elder Absolute", power: 280000, maxHealth: 560000, minLevel: 142 },
  { name: "Ancient Absolute", power: 320000, maxHealth: 640000, minLevel: 144 },
  {
    name: "Primordial Absolute",
    power: 360000,
    maxHealth: 720000,
    minLevel: 146,
  },
  {
    name: "Celestial Absolute",
    power: 400000,
    maxHealth: 800000,
    minLevel: 148,
  },
  { name: "Astral Absolute", power: 450000, maxHealth: 900000, minLevel: 150 },

  // Level 150+: Infinite End Game
  { name: "Cosmic Absolute", power: 500000, maxHealth: 1000000, minLevel: 152 },
  { name: "Void Absolute", power: 600000, maxHealth: 1200000, minLevel: 154 },
  {
    name: "Abyssal Absolute",
    power: 700000,
    maxHealth: 1400000,
    minLevel: 156,
  },
  {
    name: "Elder Omniscient",
    power: 800000,
    maxHealth: 1600000,
    minLevel: 158,
  },
  {
    name: "Ancient Omniscient",
    power: 900000,
    maxHealth: 1800000,
    minLevel: 160,
  },

  // Level 160+: Final End Game
  {
    name: "Primordial Omniscient",
    power: 1000000,
    maxHealth: 2000000,
    minLevel: 162,
  },
  {
    name: "Celestial Omniscient",
    power: 1200000,
    maxHealth: 2400000,
    minLevel: 164,
  },
  {
    name: "Astral Omniscient",
    power: 1400000,
    maxHealth: 2800000,
    minLevel: 166,
  },
  {
    name: "Cosmic Omniscient",
    power: 1600000,
    maxHealth: 3200000,
    minLevel: 168,
  },
  {
    name: "Void Omniscient",
    power: 1800000,
    maxHealth: 3600000,
    minLevel: 170,
  },
  {
    name: "Abyssal Omniscient",
    power: 2000000,
    maxHealth: 4000000,
    minLevel: 172,
  },
];
