import { Effect, pipe, String, Record, Schema, Option } from "effect";
import { Display, k } from "./display.ts";
import { Player } from "./player.ts";
import { seqDiscard } from "../effectHelpers.ts";

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

    const intro = seqDiscard(
      display`Welcome to the Weaponsmith, you can buy new weapons here.`,
      newLine,
      Effect.gen(function* () {
        const playerLevel = yield* Player.level;
        yield* display`Current player level: ${playerLevel}, current player weapons: ${(yield* Player.rightHand) ?? "-"}/${(yield* Player.leftHand) ?? "-"}`;
      })
    );

    const buyWeapon = Effect.gen(function* () {
      const playerLevel = yield* Player.level;
      const rightHandWeapon = yield* Player.rightHand;
      const leftHandWeapon = yield* Player.leftHand;
      const { items } = yield* Player.eq;

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
                    const playerGold = yield* Player.gold;
                    const cost = weaponCost[weapon];

                    if (playerGold < cost) {
                      yield* newLine;
                      yield* display`You don't have enough gold to buy ${weapon}`;
                      return;
                    }

                    yield* Player.updateGold((g) => g - cost);
                    yield* Player.updateEq((eq) => ({
                      ...eq,
                      items: [...eq.items, { type: "weapon", name: weapon }],
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
                          Player.updateEq((eq) =>
                            Option.isSome(eq.leftHand)
                              ? {
                                  ...eq,
                                  leftHand: Option.some(weapon),
                                  items: [
                                    ...eq.items.filter(
                                      (i) =>
                                        !(
                                          i.type === "weapon" &&
                                          i.name === weapon
                                        )
                                    ),
                                    { type: "weapon", name: eq.leftHand.value },
                                  ],
                                }
                              : {
                                  ...eq,
                                  leftHand: Option.some(weapon),
                                }
                          ),
                          display`Equipped on left hand`
                        ),
                        r: seqDiscard(
                          Player.updateEq((eq) =>
                            Option.isSome(eq.rightHand)
                              ? {
                                  ...eq,
                                  rightHand: Option.some(weapon),
                                  items: [
                                    ...eq.items.filter(
                                      (i) =>
                                        !(
                                          i.type === "weapon" &&
                                          i.name === weapon
                                        )
                                    ),
                                    {
                                      type: "weapon",
                                      name: eq.rightHand.value,
                                    },
                                  ],
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

    const weaponsmith: Effect.Effect<void, never, Player> = Effect.gen(
      function* () {
        yield* display`
        [W] Buy a weapon
        [S] Show stats
        [R] Return to the town square
        `;

        yield* choice(
          {
            w: seqDiscard(buyWeapon, weaponsmith),
            s: seqDiscard(Player.stats, weaponsmith),
            r: Effect.void,
          },
          { defaultOption: "s" }
        );
      }
    );

    return { intro, weaponsmith };
  }),

  dependencies: [Display.Default],
}) {}
