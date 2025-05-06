import { Command } from "@effect/cli";
import { Effect } from "effect";
import { dragon } from "./dragon.ts";

const command = Command.make("hello", {}, () => Effect.log("test")).pipe(
  Command.withSubcommands([dragon])
);

export const run = Command.run(command, {
  name: "Hello World",
  version: "0.0.0",
});
