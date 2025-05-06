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

export const display = Effect.fn("display")(function* (
  s: string | TemplateStringsArray,
  ...args: any[]
) {
  const terminal = yield* Terminal.Terminal;
  yield* terminal.display(displayLines(s, ...args));
});

export const displayYield = Effect.fn("displayYield")(function* (
  s?: string | TemplateStringsArray,
  ...args: any[]
) {
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
});

export const newLine = display``;

export const choice = <
  A,
  E,
  R,
  C extends Record<string, Effect.Effect<A, E, R>>
>(
  choices: C
) =>
  Effect.fn("choice")(function* (
    opts: {
      defaultOption?: keyof C & string;
      promptPrefix?: string;
    } = {}
  ) {
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

    return yield* choices[input];
  });

export const quit = Effect.sync(() => process.exit(0));
export const clearScreen = Effect.sync(console.clear);
