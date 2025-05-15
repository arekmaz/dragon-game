import { Terminal } from "@effect/platform";
import { Effect, pipe, String } from "effect";
import { EOL } from "node:os";

import k from "kleur";

export { k };

export type Color = k.Color;

export class Display extends Effect.Service<Display>()("Display", {
  effect: Effect.gen(function* () {
    const terminal = yield* Terminal.Terminal;

    const displayLines = (s: string | TemplateStringsArray, ...args: any[]) => {
      if (typeof s === "string") {
        return s
          .replace(/^[\n\r]+/, "")
          .replace(/^([\s])+/gm, "")
          .replace(/\n?$/, EOL);
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
        .replace(/\n?$/, EOL);
    };

    const displayRaw = function (
      s: string | TemplateStringsArray,
      ...args: any[]
    ) {
      return Effect.orDie(
        Effect.gen(function* () {
          yield* terminal.display(
            k.green(globalThis.String.raw({ raw: s }, ...args))
          );
        })
      );
    };

    const display = function (
      s: string | TemplateStringsArray,
      ...args: any[]
    ) {
      return displayRaw(displayLines(s, ...args));
    };

    const displayYield = function (
      s?: string | TemplateStringsArray,
      ...args: any[]
    ) {
      return Effect.orDie(
        Effect.gen(function* () {
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
      Effect.Effect.Context<Values<C>>
    > =>
      Effect.gen(function* () {
        let input: string = "";

        const prompt = displayRaw`\n${
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

          yield* newLine;
        }

        yield* displayRaw`${opts.defaultOption ? " " : ""}${input} `;
        yield* newLine;

        const result = yield* choices[input];

        return result;
      });

    const clearScreen = Effect.sync(console.clear);

    const horizontalFullLine = (color = k.white) =>
      terminal.columns.pipe(
        Effect.flatMap((cols) =>
          pipe(
            "-",
            String.repeat(cols),
            String.concat(EOL),
            color,
            terminal.display,
            Effect.orDie
          )
        )
      );

    const sunrise = displayRaw(
      k.yellow(`
      \\ | /       
    '-.;;;.-'     
   -==;;;;;==-
    .-';;;'-.     
      / | \\      
`) +
        k.green(`
~ ~ ~ ~ ~ ~ ~ ~ ~
  ~ ~ ~ ~ ~ ~ ~
`)
    );

    const bed = displayRaw(
      k.white(`
      ()___ 
    ()//__/)_________________()
    ||(___)//#/_/#/_/#/_/#()/||
    ||----|#| |#|_|#|_|#|_|| ||
    ||____|_|#|_|#|_|#|_|#||/||
    ||    |#|_|#|_|#|_|#|_||
`)
    );

    return {
      display,
      displayYield,
      newLine,
      choice,
      clearScreen,
      displayRaw,
      horizontalFullLine,
      sunrise,
      bed,
    };
  }),
}) {}
