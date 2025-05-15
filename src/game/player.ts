import { Data, Effect, Ref } from "effect";
import { Display } from "./display.ts";

export const weapons = {
  stick: 2,
  dagger: 5,
  sword: 10,
  axe: 15,
  mace: 20,
  club: 25,
  greatsword: 30,
  halberd: 35,
  greatmace: 40,
  greataxe: 45,
  greatclub: 50,
  greathalberd: 60,
};

type Weapon = keyof typeof weapons;

type Eq = { weapon: Weapon };

export const playerClasses = ["mage", "assassin", "warrior", "archer"] as const;
type PlayerClass = (typeof playerClasses)[number];

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

export class Player extends Effect.Service<Player>()("Player", {
  effect: Effect.gen(function* () {
    const { display, newLine } = yield* Display;

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
      eq: { weapon: "stick" },
      gold: 500,
      exp:
        startingExp -
        requiredLvlExp.slice(0, startingLvl - 1).reduce((a, b) => a + b, 0),
    });

    const stats = Effect.gen(function* () {
      const { name, class: playerClass, health, eq, gold, exp } = yield* data;
      yield* display`--------------------------------`;
      yield* display`${name}'s stats:`;
      yield* display`--------------------------------`;
      yield* newLine;
      const level = lvlByExp(exp);

      const currentLevelExp =
        exp - requiredLvlExp.slice(0, level - 1).reduce((a, b) => a + b, 0);

      yield* display`
    Name: ${name}
    Class: ${playerClass}
    Health: ${health}/${maxHealth(level)}
    Level: ${level}
    Exp: ${currentLevelExp}/${getExpRequiredForLvl(level)}
    Equipped weapon: ${eq.weapon}
    Gold: ${gold}
  `;

      yield* newLine;
    });

    return { data, stats };
  }),
  dependencies: [Display.Default],
}) {
  static data = this.use((s) => s.data);

  static name = Effect.map(this.data, (d) => d.name);
  static class = Effect.map(this.data, (d) => d.class);

  static eq = Effect.map(this.data, (d) => d.eq);
  static weapon = Effect.map(this.data, (d) => d.eq.weapon);

  static level = Effect.map(this.data, (d) => lvlByExp(d.exp));
  static exp = Effect.map(this.data, (d) => d.exp);
  // returns how many level-ups did player get
  static addExp = (e: number) =>
    this.use((d) =>
      Ref.modify(d.data, (o) => [
        lvlByExp(o.exp + e) - lvlByExp(o.exp),
        { ...o, exp: o.exp + e },
      ])
    );

  static gold = Effect.map(this.data, (d) => d.gold);
  static updateGold = (fn: (o: number) => number) =>
    this.use((d) => Ref.update(d.data, (o) => ({ ...o, gold: fn(o.gold) })));

  static health = Effect.map(this.data, (d) => d.health);
  static isAlive = Effect.map(this.data, (d) => d.health > 0);
  static maxHealth = Effect.map(this.data, (d) => maxHealth(lvlByExp(d.exp)));
  static updateHealth = (fn: (o: number) => number) =>
    this.use((d) =>
      Ref.modify(d.data, (o) => [fn(o.health), { ...o, health: fn(o.health) }])
    );

  static decreaseHealth = (dmg: number) =>
    this.updateHealth((h) => h - dmg).pipe(
      Effect.filterOrFail(
        (h) => h > 0,
        () => new PlayerDeadException({ reason: "damage", amount: dmg })
      )
    );

  static increaseHealth = (health: number) =>
    this.updateHealth((h) => h + health);
}

export class PlayerDeadException extends Data.TaggedError(
  "PlayerDeadException"
)<{
  reason: "damage";
  amount: number;
}> {}
