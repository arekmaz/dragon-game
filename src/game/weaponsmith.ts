import { Effect, pipe, String, Record } from "effect";
import { Display, k } from "./display.ts";
import { Player } from "./player.ts";

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

    const intro = Effect.all([
      display`Welcome to the Weaponsmith, you can buy new weapons here.`,
      newLine,
      Effect.gen(function* () {
        const playerLevel = yield* Player.level;
        yield* display`Current player level: ${playerLevel}, current player weapons: ${(yield* Player.rightHand) ?? "-"}/${(yield* Player.leftHand) ?? "-"}`;
      }),
    ]);

    const buyWeapon = Effect.gen(function* () {
      const playerLevel = yield* Player.level;
      const rightHandWeapon = yield* Player.rightHand;
      const leftHandWeapon = yield* Player.leftHand;
      const { items } = yield* Player.eq;

      yield* newLine;

      yield* display`
        Weapon inventory:
        ${Object.entries(weapons)
          .map(([weapon, power]) => {
            const weaponName = pipe(weapon, String.capitalize, k.white);

            if (rightHandWeapon === weapon || leftHandWeapon === weapon) {
              return `${weaponName} [equipped] - ${power} power, cost: ${
                weaponCost[weapon as Weapon]
              } gold`;
            }

            if (items.some((i) => i.type === "weapon" && i.name === weapon)) {
              return `${weaponName} [owned] - ${power} power, cost: ${
                weaponCost[weapon as Weapon]
              } gold`;
            }

            if (playerLevel >= weaponMinLevel[weapon as Weapon]) {
              return `${weaponName} - ${power} power, cost: ${
                weaponCost[weapon as Weapon]
              } gold, available`;
            }

            return `${weaponName} - ${power} power, cost: ${
              weaponCost[weapon as Weapon]
            } gold`;
          })
          .join("\n")}
      `;

      const weaponsToBuy = Object.keys(weapons).filter(
        (weapon) =>
          playerLevel >= weaponMinLevel[weapon as Weapon] &&
          !items.some((i) => i.type === "weapon" && i.name === weapon) &&
          rightHandWeapon !== weapon &&
          leftHandWeapon !== weapon
      );

      if (weaponsToBuy.length === 0) {
        yield* newLine;
        yield* display`No weapons available to buy`;
        yield* newLine;
        return;
      }

      const chooseWeapon = Effect.all([
        newLine,
        display`Weapons available to buy (Q to cancel):

      ${weaponsToBuy
        .map((weapon, i) => {
          const weaponName = pipe(weapon, String.capitalize, k.white);
          const power = weapons[weapon as Weapon];

          return `[${i}]: ${weaponName} - ${power} power, cost: ${
            weaponCost[weapon as Weapon]
          } gold`;
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
                    const cost = weaponCost[weapon as Weapon];

                    if (playerGold < cost) {
                      yield* newLine;
                      yield* display`You don't have enough gold to buy ${weapon}`;
                      return;
                    }

                    yield* Player.updateGold((g) => g - cost);
                    yield* Player.updateEq((eq) => ({
                      ...eq,
                      items: [
                        ...eq.items,
                        { type: "weapon", name: weapon as Weapon },
                      ],
                    }));

                    yield* newLine;
                    yield* display`You bought ${weapon}, paid ${cost} gold`;

                    yield* display`Do you want to equip it?
                    [L] left hand
                    [R] right hand
                    [Q] cancel
                    `;

                    yield* choice({
                      l: Effect.all([
                        Player.updateEq((eq) => ({
                          ...eq,
                          leftHand: weapon as Weapon,
                        })),
                        display`Equipped on left hand`,
                      ]),
                      r: Effect.all([
                        Player.updateEq((eq) => ({
                          ...eq,
                          rightHand: weapon as Weapon,
                        })),
                        display`Equipped on right hand`,
                      ]),
                      q: Effect.void,
                    });
                  }),
                ] as const
            ),
            ["q", Effect.void],
          ]),
          { defaultOption: "q" }
        ),
      ]);

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
            w: Effect.all([buyWeapon, weaponsmith]),
            s: Effect.all([Player.stats, weaponsmith]),
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
