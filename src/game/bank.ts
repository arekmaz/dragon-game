import { Effect, Ref, Schema } from "effect";
import { Display, k } from "./display.ts";
import { Player } from "./player.ts";
import { Terminal } from "@effect/platform/Terminal";

export class Bank extends Effect.Service<Bank>()("Bank", {
  effect: Effect.gen(function* () {
    const { display, newLine, choice } = yield* Display;
    const terminal = yield* Terminal;
    const bankRef = yield* Ref.make(0);

    const bankIntro = display`Welcome to the bank, how can I help you?`;

    const depositGold = Effect.gen(function* () {
      const playerGold = yield* Player.gold;

      const readAmount: Effect.Effect<number, never, Terminal> =
        terminal.readLine.pipe(
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
              display`Incorrect amount, enter a number between 0-${playerGold}`
          ),
          Effect.orElse(() => readAmount)
        );

      const amount = yield* readAmount;

      yield* Player.updateGold((g) => g - amount);
      yield* Ref.update(bankRef, (b) => b + amount);
      yield* display`Deposited ${amount} gold`;
    });

    const depositAllGold = Effect.gen(function* () {
      const playerGold = yield* Player.gold;

      yield* Player.updateGold((g) => g - playerGold);
      yield* Ref.update(bankRef, (b) => b + playerGold);
      yield* display`Deposited everything - ${k.yellow(playerGold)} gold`;
    });

    const bank: Effect.Effect<void, void, Terminal | Player> = Effect.gen(
      function* () {
        yield* display`
  [A] Deposit all gold
  [D] Deposit some amount of gold
  [W] Withdraw all gold
  [C] Withdraw some amount of gold
  [S] Show stats
  [R] Return to the town square`;

        yield* choice(
          {
            a: Effect.all([depositAllGold, bank]),
            d: Effect.all([depositGold, bank]),
            w: Effect.void,
            c: Effect.void,
            s: Effect.all([Player.use((s) => s.stats), bank]),
            r: Effect.void,
          },
          { defaultOption: "s" }
        );
      }
    );

    return {
      bankIntro,
      bank,
    };
  }),
  dependencies: [Display.Default],
}) {}
