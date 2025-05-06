import { Command } from "@effect/cli";
import { runGame } from "./game.ts";

const command = Command.make("dragon", {}, () => runGame);

export const run = Command.run(command, {
  name: "Dragon Game",
  version: "0.0.1",
});
