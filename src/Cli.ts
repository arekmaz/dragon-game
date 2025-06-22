import { Command, Options } from "@effect/cli";
import { Effect, Layer, Logger, LogLevel } from "effect";
import { GameCmd } from "./game.ts";

const command = Command.make(
  "dragon",
  {
    debug: Options.boolean("debug", { aliases: ["d"], ifPresent: true }),
  },
  Effect.fn("dragon-game")(function* ({ debug }) {
    return yield* Effect.gen(function* () {
      if (debug) {
        yield* Effect.logDebug("Debug mode enabled");
      }
      return yield* Layer.launch(GameCmd.Default);
    }).pipe(Logger.withMinimumLogLevel(debug ? LogLevel.Debug : LogLevel.Info));
  })
);

export const run = Command.run(command, {
  name: "Dragon Game",
  version: "0.0.1",
});
