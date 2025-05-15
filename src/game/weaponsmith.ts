import { Effect } from "effect";
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

export type Weapon = keyof typeof weapons;

export class Weaponsmith extends Effect.Service<Weaponsmith>()("weaponsmith", {
  effect: Effect.gen(function* () {
    const { display } = yield* Display;

    const intro = display`Welcome to the Weaponsmith`;

    return { intro };
  }),

  dependencies: [Display.Default],
}) {}
