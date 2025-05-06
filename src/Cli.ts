import { Command } from "@effect/cli";
import { dragon } from "./dragon.ts";

const command = Command.make("dragon", {}, () => dragon);

export const run = Command.run(command, {
  name: "Dragon Game",
  version: "0.0.1",
});
