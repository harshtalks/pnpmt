// Import necessary modules from the libraries
import { Command } from "@effect/cli";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { Effect } from "effect";
import { listCommand } from "./list";

const command = Command.make("pnpmt").pipe(
  Command.withDescription(
    "A CLI application for running commands in nested packages directlyn from the root - works for pnpm workspaces.",
  ),
  Command.withSubcommands([listCommand]),
);

// Set up the CLI application
const cli = Command.run(command, {
  name: "PNPMT",
  version: "v1.0.0",
  executable: "pnpmt",
  footer: {
    _tag: "Empty",
  },
});

// Prepare and run the CLI application
cli(process.argv).pipe(NodeRuntime.runMain);
