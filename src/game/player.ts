import { Data, Effect, Ref } from "effect";
import { display, newLine } from "./display.ts";

export const weapons = { stick: 2, dagger: 5 };
type Weapon = keyof typeof weapons;

type Eq = { weapon: Weapon };

type PlayerClass = "mage" | "assassin" | "warrior" | "archer";

const maxHealth = (level: number) => 20 + (level - 1) * 2;

const requiredLvlExp = [50, 100, 170, 250, 400];

const getExpRequiredForLvl = (lvl: number) =>
  requiredLvlExp[Math.min(lvl - 1, requiredLvlExp.length - 1)];

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

    return data;
  }),
}) {
  static data = this.use((s) => s);

  static name = Effect.map(this.data, (d) => d.name);
  static class = Effect.map(this.data, (d) => d.class);

  static eq = Effect.map(this.data, (d) => d.eq);
  static weapon = Effect.map(this.data, (d) => d.eq.weapon);

  static level = Effect.map(this.data, (d) => lvlByExp(d.exp));
  static exp = Effect.map(this.data, (d) => d.exp);
  // returns how many level-ups did player get
  static addExp = (e: number) =>
    this.use((d) =>
      Ref.modify(d, (o) => [
        lvlByExp(o.exp + e) - lvlByExp(o.exp),
        { ...o, exp: o.exp + e },
      ])
    );

  static gold = Effect.map(this.data, (d) => d.gold);
  static updateGold = (fn: (o: number) => number) =>
    this.use((d) => Ref.update(d, (o) => ({ ...o, gold: fn(o.gold) })));

  static health = Effect.map(this.data, (d) => d.health);
  static isAlive = Effect.map(this.data, (d) => d.health > 0);
  static maxHealth = Effect.map(this.data, (d) => maxHealth(lvlByExp(d.exp)));
  static updateHealth = (fn: (o: number) => number) =>
    this.use((d) =>
      Ref.modify(d, (o) => [fn(o.health), { ...o, health: fn(o.health) }])
    );

  static decreaseHealth = (dmg: number) =>
    this.updateHealth((h) => h - dmg).pipe(
      Effect.filterOrFail(
        (h) => h > 0,
        () => new PlayerDeadException({ reason: "Dealt damage" })
      )
    );

  static increaseHealth = (health: number) =>
    this.updateHealth((h) => h + health);
}

export const stats = Effect.gen(function* () {
  yield* display`--------------------------------`;
  yield* display`${yield* Player.name}'s stats:`;
  yield* display`--------------------------------`;
  yield* newLine;
  const level = yield* Player.level;

  yield* display`
    Name: ${yield* Player.name}
    Class: ${yield* Player.class}
    Health: ${yield* Player.health}/${yield* Player.maxHealth}
    Level: ${level}
    Exp: ${yield* Player.exp}/${getExpRequiredForLvl(level)}
    Equipped weapon: ${yield* Effect.map(Player.eq, (eq) => eq.weapon)}
    Gold: ${yield* Player.gold}
  `;

  yield* newLine;
});

export class PlayerDeadException extends Data.TaggedError(
  "PlayerDeadException"
)<{
  reason: string;
}> {}
