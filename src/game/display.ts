import { Terminal } from "@effect/platform";
import { Effect } from "effect";

export const displayLines = (
  s: string | TemplateStringsArray,
  ...args: any[]
) => {
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

export const display = function (
  s: string | TemplateStringsArray,
  ...args: any[]
) {
  return Effect.orDie(
    Effect.gen(function* () {
      const terminal = yield* Terminal.Terminal;
      yield* terminal.display(displayLines(s, ...args));
    })
  );
};

export const displayYield = function (
  s?: string | TemplateStringsArray,
  ...args: any[]
) {
  return Effect.orDie(
    Effect.gen(function* () {
      const terminal = yield* Terminal.Terminal;

      if (s !== undefined) {
        yield* display(s, ...args);
      }

      yield* display(`Press <ENTER> to continue`);

      while (true) {
        const input = yield* terminal.readInput;

        if (input.key.name === "return") {
          break;
        }
      }
    })
  );
};

export const newLine = display``;

type Values<T> = T[keyof T];

export const choice = <C extends Record<string, Effect.Effect<any, any, any>>>(
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

      const prompt = display`${
        opts.promptPrefix ?? "Enter an option"
      } [${Object.keys(choices)
        .map((c) => c.toUpperCase())
        .join(",")}]: ${
        opts.defaultOption ? `(${opts.defaultOption.toUpperCase()})` : ""
      }`;

      while (!(input in choices)) {
        yield* prompt;
        yield* newLine;
        input = (yield* terminal.readInput).key.name.toLowerCase();

        if (input === "return") {
          input = opts.defaultOption ?? "";
        }
      }

      const result = yield* choices[input];

      return result;
    })
  );

export const quit = Effect.sync(() => process.exit(0));
export const clearScreen = Effect.sync(console.clear);
