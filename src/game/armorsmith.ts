import { Effect } from "effect";
import { Display } from "./display.ts";

export const armors = {
  leather: 2,
  chainmail: 5,
  plate: 10,
  carbon: 15,
  titanium: 20,
};

export type Armor = keyof typeof armors;

export class Armorsmith extends Effect.Service<Armorsmith>()("armorsmith", {
  effect: Effect.gen(function* () {
    const { display } = yield* Display;

    const intro = display`Welcome to the Armorsmith`;

    return { intro };
  }),

  dependencies: [Display.Default],
}) {}
