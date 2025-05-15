import { Data, Effect, pipe, Ref, String } from "effect";
import { Display, k } from "./display.ts";
import { type Weapon } from "./weaponsmith.ts";

type EqItem = { type: "weapon"; name: Weapon };

type Eq = {
  rightHand: Weapon | null;
  leftHand: Weapon | null;
  items: Array<EqItem>;
};

export const playerClasses = ["mage", "assassin", "warrior", "archer"] as const;
export type PlayerClass = (typeof playerClasses)[number];

const makeDisplayClass = (c: PlayerClass) => pipe(c, String.capitalize, k.cyan);

const maxHealth = (level: number) => 20 + (level - 1) * 2;

const requiredLvlExp = [50, 100, 170, 250, 400];

const getExpRequiredForLvl = (lvl: number) => requiredLvlExp[lvl - 1];

const lvlByExp = (exp: number) => {
  let result = 0;
  let expLeft = exp;

  for (const required of requiredLvlExp) {
    result++;

    if (expLeft < required) {
      return result;
    }

    expLeft -= required;
  }

  return result;
};

const startingExp = 0;

const makeDisplayName = (n: string) => pipe(n, String.capitalize, k.white);

export class Player extends Effect.Service<Player>()("Player", {
  effect: Effect.gen(function* () {
    const { display, newLine, horizontalFullLine } = yield* Display;

    const startingLvl = lvlByExp(startingExp);

    const data = yield* Ref.make<{
      name: string;
      health: number;
      eq: Eq;
      gold: number;
      exp: number;
      class: PlayerClass;
    }>({
      class: "warrior",
      name: "Player",
      health: maxHealth(startingLvl),
      eq: { rightHand: "stick", leftHand: null, items: [] },
      gold: 500,
      exp:
        startingExp -
        requiredLvlExp.slice(0, startingLvl - 1).reduce((a, b) => a + b, 0),
    });

    const stats = Effect.gen(function* () {
      const { name, class: playerClass, health, eq, gold, exp } = yield* data;
      yield* newLine;
      yield* horizontalFullLine();
      yield* display`${makeDisplayName(name)}'s stats:`;
      yield* horizontalFullLine();
      yield* newLine;

      const level = lvlByExp(exp);

      const currentLevelExp =
        exp - requiredLvlExp.slice(0, level - 1).reduce((a, b) => a + b, 0);

      yield* display`
        Name: ${makeDisplayName(name)}
        Class: ${makeDisplayClass(playerClass)}
        Health: ${health}/${maxHealth(level)}
        Level: ${level}
        Exp: ${currentLevelExp}/${getExpRequiredForLvl(level)}
        Right hand: ${eq.rightHand ?? "-"}
        Left hand: ${eq.leftHand ?? "-"}
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
          () => new PlayerDeadException({ reason: "damage", amount: dmg })
        )
      );

    const increaseHealth = (health: number) => updateHealth((h) => h + health);

    const updateEq = (fn: (o: Eq) => Eq) =>
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
    };
  }),
  accessors: true,
  dependencies: [Display.Default],
}) {}

export class PlayerDeadException extends Data.TaggedError(
  "PlayerDeadException"
)<{
  reason: "damage";
  amount: number;
}> {}
