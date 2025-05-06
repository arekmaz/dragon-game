import { Terminal } from "@effect/platform";
import { Effect } from "effect";

import k from "kleur";

export { k };

export class Display extends Effect.Service<Display>()("Display", {
  effect: Effect.gen(function* () {
    const terminal = yield* Terminal.Terminal;

    const displayLines = (s: string | TemplateStringsArray, ...args: any[]) => {
      if (typeof s === "string") {
        return s
          .replace(/^[\n\r]+/, "")
          .replace(/^([\s])+/gm, "")
          .replace(/\n?$/, "\n");
      }

      let result = "";

      for (let i = 0; i < s.length; i++) {
        if (i === 0) {
          result += s[0];
          continue;
        }

        result += args[i - 1] + s[i];
      }

      return result
        .replace(/^[\n\r]+/, "")
        .replace(/^([ ])+/gm, "")
        .replace(/\n?$/, "\n");
    };

    const displayRaw = function (
      s: string | TemplateStringsArray,
      ...args: any[]
    ) {
      return Effect.orDie(
        Effect.gen(function* () {
          yield* terminal.display(k.green(String.raw({ raw: s }, ...args)));
        })
      );
    };

    const display = function (
      s: string | TemplateStringsArray,
      ...args: any[]
    ) {
      return Effect.orDie(
        Effect.gen(function* () {
          yield* displayRaw(displayLines(s, ...args));
        })
      );
    };

    const displayYield = function (
      s?: string | TemplateStringsArray,
      ...args: any[]
    ) {
      return Effect.orDie(
        Effect.gen(function* () {
          const terminal = yield* Terminal.Terminal;

          if (s !== undefined) {
            yield* display(s, ...args);
          }

          yield* displayRaw(`Press <ENTER> to continue`);

          while (true) {
            const input = yield* terminal.readInput;

            if (input.key.name === "return") {
              break;
            }
          }
        })
      );
    };

    const newLine = display``;

    type Values<T> = T[keyof T];

    const choice = <C extends Record<string, Effect.Effect<any, any, any>>>(
      choices: C,
      opts: {
        defaultOption?: keyof C & string;
        promptPrefix?: string;
      } = {}
    ): Effect.Effect<
      Effect.Effect.Success<Values<C>>,
      Effect.Effect.Error<Values<C>>,
      Effect.Effect.Context<Values<C>> | Terminal.Terminal
    > =>
      Effect.orDie(
        Effect.gen(function* () {
          const terminal = yield* Terminal.Terminal;

          let input: string = "";

          const prompt = displayRaw`${
            opts.promptPrefix ?? "Enter an option"
          } [${Object.keys(choices)
            .map((c) => c.toUpperCase())
            .join(",")}]: ${
            opts.defaultOption ? `(${opts.defaultOption.toUpperCase()})` : ""
          }`;

          while (!(input in choices)) {
            yield* prompt;
            input = (yield* terminal.readInput).key.name.toLowerCase();

            if (input === "return") {
              input = opts.defaultOption ?? "";
            }

            if (input in choices) {
              continue;
            }
          }

          yield* displayRaw` ${input} `;
          yield* newLine;

          const result = yield* choices[input];

          return result;
        })
      );

    const clearScreen = Effect.sync(console.clear);

    return {
      display,
      displayYield,
      newLine,
      choice,
      clearScreen,
      displayRaw,
    };
  }),
}) {}
