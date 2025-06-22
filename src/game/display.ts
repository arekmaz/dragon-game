import { Terminal } from "@effect/platform";
import { Array, Effect, pipe, Record, String } from "effect";
import { EOL } from "node:os";

import k from "kleur";
import { NodeTerminal } from "@effect/platform-node";

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
      return Effect.gen(function* () {
        yield* terminal.display(
          k.green(globalThis.String.raw({ raw: s }, ...args))
        );
      }).pipe(Effect.ignore);
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
      return Effect.gen(function* () {
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
      }).pipe(Effect.ignore);
    };

    const newLine = display``;

    const choice = Effect.fn("choice")(function* <A, R, E, K extends string>(
      choices: Record<K, Effect.Effect<A, E, R>>,
      opts: {
        defaultOption?: NoInfer<K>;
        promptPrefix?: string;
      } = {}
    ) {
      let input: string = "";

      const displayChoices = pipe(
        choices,
        Record.keys,
        Array.map(String.toUpperCase),
        Array.join(",")
      );

      const prompt = displayRaw`\n${
        opts.promptPrefix ?? "Enter an option"
      } [${displayChoices}]: ${
        opts.defaultOption ? `(${opts.defaultOption.toUpperCase()})` : ""
      }`;

      while (!(input in choices)) {
        yield* prompt;

        input = yield* terminal.readInput.pipe(
          Effect.map((a) => a.key.name.toLowerCase()),
          Effect.orElseSucceed(() => "")
        );

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

      const result = yield* choices[input as K];

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
            Effect.ignore
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

  dependencies: [NodeTerminal.layer],
}) {}
