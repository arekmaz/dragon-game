import { Command } from "@effect/cli";
import { Layer, Logger, LogLevel } from "effect";
import { GameCmd } from "./game.ts";

const command = Command.make("dragon", {}, () =>
  Logger.withMinimumLogLevel(Layer.launch(GameCmd.Default), LogLevel.Debug)
);

export const run = Command.run(command, {
  name: "Dragon Game",
  version: "0.0.1",
});
