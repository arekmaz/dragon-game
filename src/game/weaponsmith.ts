import { Data, Effect, Option, pipe, Record, String } from "effect";
import { seqDiscard } from "../effectHelpers.ts";
import { Display, k } from "./display.ts";
import { EqItemSchema, Player } from "./player.ts";
import { type Weapon, weapons } from "./weapons.ts";

const weaponMinLevel: Record<Weapon, number> = {
  stick: 1,
  dagger: 1,
  sword: 2,
  axe: 2,
  mace: 3,
  greatsword: 4,
  halberd: 4,
  greatmace: 5,
  greataxe: 5,
  greathalberd: 6,
};

const weaponCost: Record<Weapon, number> = {
  stick: 10,
  dagger: 20,
  sword: 30,
  axe: 40,
  mace: 50,
  greatsword: 70,
  halberd: 80,
  greatmace: 90,
  greataxe: 100,
  greathalberd: 120,
};

export class Weaponsmith extends Effect.Service<Weaponsmith>()("weaponsmith", {
  effect: Effect.gen(function* () {
    const { display, newLine, choice } = yield* Display;

    const player = yield* Player;

    const intro = seqDiscard(
      display`Welcome to the Weaponsmith, you can buy new weapons here.`,
      newLine,
      Effect.gen(function* () {
        const playerLevel = yield* player.level;
        yield* display`Current player level: ${playerLevel}, current player weapons: ${Option.getOrElse(yield* player.rightHand, () => "-")}/${Option.getOrElse(yield* player.leftHand, () => "-")}`;
      })
    );

    const buyWeapon = Effect.gen(function* () {
      const playerLevel = yield* player.level;
      const rightHandWeapon = yield* player.rightHand;
      const leftHandWeapon = yield* player.leftHand;
      const { items } = yield* player.eq;

      yield* newLine;

      yield* display`
        Weapon inventory:
        ${Record.collect(weapons, (weapon, power) => {
          const weaponName = pipe(weapon, String.capitalize, k.white);
          const cost = weaponCost[weapon];
          const minLevel = weaponMinLevel[weapon];

          if (
            Option.getOrNull(rightHandWeapon) === weapon ||
            Option.getOrNull(leftHandWeapon) === weapon
          ) {
            return `${weaponName} [equipped] - ${power} power, cost: ${cost} gold`;
          }

          if (items.some((i) => i.type === "weapon" && i.name === weapon)) {
            return `${weaponName} [owned] - ${power} power, cost: ${cost} gold`;
          }

          if (playerLevel >= minLevel) {
            return `${weaponName} - ${power} power, cost: ${cost} gold, available`;
          }

          return `${weaponName} - ${power} power, cost: ${cost} gold, min level: ${minLevel}`;
        }).join("\n")}
      `;

      const weaponsToBuy = Record.keys(weapons).filter(
        (weapon) =>
          playerLevel >= weaponMinLevel[weapon] &&
          !items.some((i) => i.type === "weapon" && i.name === weapon) &&
          Option.getOrNull(rightHandWeapon) !== weapon &&
          Option.getOrNull(leftHandWeapon) !== weapon
      );

      if (weaponsToBuy.length === 0) {
        yield* newLine;
        yield* display`No weapons available to buy`;
        yield* newLine;
        return;
      }

      const chooseWeapon = seqDiscard(
        newLine,
        display`Weapons available to buy (Q to cancel):

      ${weaponsToBuy
        .map((weapon, i) => {
          const weaponName = pipe(weapon, String.capitalize, k.white);
          const power = weapons[weapon];

          return `[${i}]: ${weaponName} - ${power} power, cost: ${weaponCost[weapon]} gold`;
        })
        .join("\n")}
      `,
        choice(
          Record.fromEntries([
            ...weaponsToBuy.map(
              (weapon, i) =>
                [
                  i.toString(),
                  Effect.gen(function* () {
                    const playerGold = yield* player.gold;
                    const cost = weaponCost[weapon];

                    if (playerGold < cost) {
                      yield* newLine;
                      yield* display`You don't have enough gold to buy ${weapon}`;
                      return;
                    }

                    yield* player.updateGold((g) => g - cost);
                    yield* player.updateEq((eq) => ({
                      ...eq,
                      items: Data.array([
                        ...eq.items,
                        EqItemSchema.make({ type: "weapon", name: weapon }),
                      ]),
                    }));

                    yield* newLine;
                    yield* display`You bought ${weapon}, paid ${cost} gold`;
                    yield* newLine;

                    yield* display`Do you want to equip it?

                    [L] left hand
                    [R] right hand
                    [Q] cancel
                    `;

                    yield* choice(
                      {
                        l: seqDiscard(
                          player.updateEq((eq) =>
                            Option.isSome(eq.leftHand)
                              ? {
                                  ...eq,
                                  leftHand: Option.some(weapon),
                                  items: Data.array([
                                    ...eq.items.filter(
                                      (i) =>
                                        !(
                                          i.type === "weapon" &&
                                          i.name === weapon
                                        )
                                    ),
                                    EqItemSchema.make({
                                      type: "weapon",
                                      name: eq.leftHand.value,
                                    }),
                                  ]),
                                }
                              : {
                                  ...eq,
                                  leftHand: Option.some(weapon),
                                }
                          ),
                          display`Equipped on left hand`
                        ),
                        r: seqDiscard(
                          player.updateEq((eq) =>
                            Option.isSome(eq.rightHand)
                              ? {
                                  ...eq,
                                  rightHand: Option.some(weapon),
                                  items: Data.array([
                                    ...eq.items.filter(
                                      (i) =>
                                        !(
                                          i.type === "weapon" &&
                                          i.name === weapon
                                        )
                                    ),
                                    EqItemSchema.make({
                                      type: "weapon",
                                      name: eq.rightHand.value,
                                    }),
                                  ]),
                                }
                              : {
                                  ...eq,
                                  rightHand: Option.some(weapon),
                                }
                          ),
                          display`Equipped on right hand`
                        ),
                        q: Effect.void,
                      },
                      { defaultOption: "q" }
                    );
                  }),
                ] as const
            ),
            ["q", Effect.void],
          ]),
          { defaultOption: "q" }
        )
      );

      yield* chooseWeapon;

      yield* newLine;
    });

    const weaponsmith: Effect.Effect<void, never, never> = Effect.gen(
      function* () {
        yield* display`
        [W] Buy a weapon
        [S] Show stats
        [R] Return to the town square
        `;

        yield* choice(
          {
            w: seqDiscard(buyWeapon, weaponsmith),
            s: seqDiscard(player.stats, weaponsmith),
            r: Effect.void,
          },
          { defaultOption: "s" }
        );
      }
    );

    return { intro, weaponsmith };
  }),

  dependencies: [Display.Default, Player.Default],
}) {}
