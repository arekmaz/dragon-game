import { Effect, Ref, Schema } from "effect";
import { Display, k } from "./display.ts";
import { Player } from "./player.ts";
import { Terminal } from "@effect/platform/Terminal";
import { NodeTerminal } from "@effect/platform-node";

export class Bank extends Effect.Service<Bank>()("Bank", {
  effect: Effect.gen(function* () {
    const { display, newLine, choice, displayRaw } = yield* Display;
    const terminal = yield* Terminal;
    const bankBalanceRef = yield* Ref.make(0);

    const intro = display`Welcome to the bank, how can I help you?`;

    const depositGold = Effect.gen(function* () {
      const playerGold = yield* Player.gold;

      const readAmount: Effect.Effect<number, never> = terminal.readLine.pipe(
        Effect.flatMap(
          Schema.decode(
            Schema.NumberFromString.pipe(
              Schema.int(),
              Schema.between(0, playerGold)
            )
          )
        ),
        Effect.tapError(
          () =>
            displayRaw`Incorrect amount, enter a number between 0-${playerGold}: `
        ),
        Effect.orElse(() => readAmount)
      );

      yield* displayRaw`Enter the amount of gold you would like to deposit (max. ${playerGold}): `;

      const amount = yield* readAmount;

      yield* Player.updateGold((g) => g - amount);
      yield* Ref.update(bankBalanceRef, (b) => b + amount);
      yield* display`Deposited ${amount} gold`;
    });

    const depositAllGold = Effect.gen(function* () {
      const playerGold = yield* Player.gold;

      yield* Player.updateGold((g) => g - playerGold);
      yield* Ref.update(bankBalanceRef, (b) => b + playerGold);
      yield* display`Deposited everything - ${k.yellow(playerGold)} gold`;
    });

    const checkBalance = Effect.gen(function* () {
      const bankBalance = yield* bankBalanceRef;

      yield* display`Your balance is ${k.yellow(bankBalance)} gold`;
    });

    const withdrawAllGold = Effect.gen(function* () {
      const bankBalance = yield* bankBalanceRef;

      yield* Player.updateGold((g) => g + bankBalance);
      yield* Ref.update(bankBalanceRef, (b) => 0);
      yield* display`Withdrew everything - ${k.yellow(bankBalance)} gold`;
    });

    const withdrawSomeGold = Effect.gen(function* () {
      const bankBalance = yield* bankBalanceRef;

      const readAmount: Effect.Effect<number, never, never> =
        terminal.readLine.pipe(
          Effect.flatMap(
            Schema.decode(
              Schema.NumberFromString.pipe(
                Schema.int(),
                Schema.between(0, bankBalance)
              )
            )
          ),
          Effect.tapError(
            () =>
              displayRaw`Incorrect amount, enter a number between 0-${bankBalance}: `
          ),
          Effect.orElse(() => readAmount)
        );

      yield* displayRaw`Enter the amount of gold you would like to withdraw (max. ${bankBalance}): `;

      const amount = yield* readAmount;

      yield* Player.updateGold((g) => g + amount);
      yield* Ref.update(bankBalanceRef, (b) => b - amount);
      yield* display`Withdrew ${k.yellow(amount)} gold`;
    });

    const bank: Effect.Effect<void, never, Player> = Effect.gen(function* () {
      yield* display`
  [B] Check your balance
  [A] Deposit all gold
  [D] Deposit some amount of gold
  [W] Withdraw all gold
  [C] Withdraw some amount of gold
  [S] Show stats
  [R] Return to the town square`;

      yield* choice(
        {
          b: Effect.all([newLine, checkBalance, bank]),
          a: Effect.all([newLine, depositAllGold, bank]),
          d: Effect.all([newLine, depositGold, bank]),
          w: Effect.all([newLine, withdrawAllGold, bank]),
          c: Effect.all([newLine, withdrawSomeGold, bank]),
          s: Effect.all([Player.stats, bank]),
          r: Effect.void,
        },
        { defaultOption: "s" }
      );
    });

    return {
      intro,
      bank,
    };
  }),
  dependencies: [Display.Default, NodeTerminal.layer],
}) {}
