import { Record, Schema } from "effect";

export const weapons = {
  stick: 2,
  dagger: 5,
  sword: 10,
  axe: 15,
  mace: 20,

  greatsword: 30,
  halberd: 35,
  greatmace: 40,
  greataxe: 45,
  greathalberd: 60,
};

export const WeaponSchema = Schema.Literal(...Record.keys(weapons));

export type Weapon = keyof typeof weapons;
