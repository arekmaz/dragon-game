import { Data, Effect, Option, pipe, Ref, Schema, String } from "effect";
import { Display, k } from "./display.ts";
import { WeaponSchema } from "./weaponsmith.ts";

export const playerClasses = ["mage", "assassin", "warrior", "archer"] as const;
export type PlayerClass = (typeof playerClasses)[number];

export class EqItemSchema extends Schema.Class<EqItemSchema>("EqItemSchema")({
  type: Schema.Literal("weapon"),
  name: WeaponSchema,
}) {}

export class EqSchema extends Schema.Class<EqSchema>("EqSchema")({
  rightHand: Schema.OptionFromSelf(WeaponSchema),
  leftHand: Schema.OptionFromSelf(WeaponSchema),
  items: Schema.Data(Schema.Array(EqItemSchema)),
}) {}

export class PlayerData extends Schema.Class<PlayerData>("PlayerSchema")({
  name: Schema.NonEmptyString,
  health: Schema.NonNegativeInt,
  eq: EqSchema,
  gold: Schema.NonNegativeInt,
  exp: Schema.NonNegativeInt,
  class: Schema.Literal(...playerClasses),
}) {}

const makeDisplayClass = (c: PlayerClass) => pipe(c, String.capitalize, k.cyan);

const maxHealth = (level: number) => 20 + (level - 1) * 2;

const getExpRequiredForLvl = (lvl: number) => {
  const baseExp = 50;
  const growthFactor = 1.2;
  const quadraticFactor = 0.5;

  return Math.floor(
    baseExp * Math.pow(growthFactor, lvl - 1) +
      quadraticFactor * Math.pow(lvl - 1, 2)
  );
};

const lvlByExp = (exp: number) => {
  let level = 1;
  let totalExp = 0;

  while (true) {
    const requiredExp = getExpRequiredForLvl(level);
    if (exp < totalExp + requiredExp) {
      return level;
    }
    totalExp += requiredExp;
    level++;
  }
};

const startingExp = 0;

const makeDisplayName = (n: string) => pipe(n, String.capitalize, k.white);

export class Player extends Effect.Service<Player>()("Player", {
  effect: Effect.gen(function* () {
    const { display, newLine, horizontalFullLine } = yield* Display;

    const startingLvl = lvlByExp(startingExp);

    const data = yield* Ref.make<PlayerData>(
      PlayerData.make({
        class: "warrior",
        name: "Player",
        health: maxHealth(startingLvl),
        eq: EqSchema.make({
          rightHand: Option.some("stick" as const),
          leftHand: Option.none(),
          items: Data.array([]),
        }),
        gold: 500,
        exp: startingExp,
      })
    );

    const stats = Effect.gen(function* () {
      const { name, class: playerClass, health, eq, gold, exp } = yield* data;
      yield* newLine;
      yield* horizontalFullLine();
      yield* display`${makeDisplayName(name)}'s stats:`;
      yield* horizontalFullLine();
      yield* newLine;

      const level = lvlByExp(exp);

      const currentLevelExp = exp - getExpRequiredForLvl(level - 1);

      yield* display`
        Name: ${makeDisplayName(name)}
        Class: ${makeDisplayClass(playerClass)}
        Health: ${health}/${maxHealth(level)}
        Level: ${level}
        Exp: ${currentLevelExp}/${getExpRequiredForLvl(level)}
        Right hand: ${Option.getOrElse(eq.rightHand, () => "-")}
        Left hand: ${Option.getOrElse(eq.leftHand, () => "-")}
        Gold: ${gold}${
        eq.items.length > 0
          ? `
          Eq: ${eq.items.map((i) => `${i.name}(${i.type})`).join("\n")}`
          : ""
      }
      `;
      yield* newLine;

      yield* horizontalFullLine();

      yield* newLine;
    });

    const displayName = Effect.map(data, (d) => makeDisplayName(d.name));

    const eq = Effect.map(data, (d) => d.eq);
    const rightHand = Effect.map(data, (d) => d.eq.rightHand);
    const leftHand = Effect.map(data, (d) => d.eq.leftHand);
    const level = Effect.map(data, (d) => lvlByExp(d.exp));
    const exp = Effect.map(data, (d) => d.exp);

    // returns how many level-ups did player get
    const addExp = (e: number) =>
      Ref.modify(data, (o) => [
        lvlByExp(o.exp + e) - lvlByExp(o.exp),
        { ...o, exp: o.exp + e },
      ]);

    const gold = Effect.map(data, (d) => d.gold);
    const updateGold = (fn: (o: number) => number) =>
      Ref.update(data, (o) => ({ ...o, gold: fn(o.gold) }));

    const health = Effect.map(data, (d) => d.health);
    const isAlive = Effect.map(data, (d) => d.health > 0);
    const getMaxHealth = Effect.map(data, (d) => maxHealth(lvlByExp(d.exp)));

    const updateHealth = (fn: (o: number) => number) =>
      Ref.modify(data, (o) => [fn(o.health), { ...o, health: fn(o.health) }]);

    const decreaseHealth = (dmg: number) =>
      updateHealth((h) => h - dmg).pipe(
        Effect.filterOrFail(
          (h) => h > 0,
          () =>
            new PlayerDeadException({ data: { reason: "damage", amount: dmg } })
        )
      );

    const dieOfPoison = (poison: string) =>
      Effect.fail(
        new PlayerDeadException({ data: { reason: "poison", type: poison } })
      );

    const increaseHealth = (health: number) => updateHealth((h) => h + health);

    const updateEq = (fn: (o: EqSchema) => EqSchema) =>
      Ref.modify(data, (o) => [
        { before: o.eq, after: fn(o.eq) },
        { ...o, eq: fn(o.eq) },
      ]);

    return {
      data,
      stats,
      displayName,
      eq,
      rightHand,
      leftHand,
      level,
      exp,
      addExp,
      gold,
      updateGold,
      health,
      isAlive,
      getMaxHealth,
      updateHealth,
      decreaseHealth,
      increaseHealth,
      updateEq,
      dieOfPoison,
    };
  }),
  accessors: true,
  dependencies: [Display.Default],
}) {}

export class PlayerDeadException extends Data.TaggedError(
  "PlayerDeadException"
)<{
  data:
    | { reason: "damage"; amount: number }
    | {
        reason: "poison";
        type: string;
      };
}> {}
