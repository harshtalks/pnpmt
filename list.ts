// List Command

import { Array, Effect, pipe } from "effect";
import {
  getPackagesFromWorkspaceConfig,
  getScriptsFromPackageJson,
  isPnpmProject,
  isPnpmWorkspace,
  runCommand,
  selectAndRunScript,
} from "./configs";
import { NodeContext, NodeFileSystem } from "@effect/platform-node";
import { Path } from "@effect/platform";
import { log } from "effect/Console";
import chalk from "chalk";
import figlet from "figlet";
import { teen } from "gradient-string";
import boxen from "boxen";
import { Command } from "@effect/cli";

const intro = () => {
  console.clear();

  const bigTitle = figlet.textSync("PNPMT", { font: "Speed" });
  const gradientTitle = teen(bigTitle);

  const header = boxen(
    gradientTitle +
      "\n" +
      chalk.bold.cyan("  (T for Traversal) - PNPM Workspace Explorer"),
    {
      padding: 1,
      borderStyle: "none",
    },
  );

  console.log(header);
};

export const listCommand = pipe(
  Command.make("list", {}, () =>
    pipe(
      Effect.try(() => intro()),
      Effect.andThen(isPnpmProject),
      Effect.andThen(isPnpmWorkspace),
      Effect.andThen(getPackagesFromWorkspaceConfig),
      Effect.andThen(Effect.forEach(getScriptsFromPackageJson)),
      Effect.andThen(selectAndRunScript),
      Effect.andThen(runCommand),
      // Error handling
      Effect.catchTag("NotAPnpmProjectError", (err) => log(err.message)),
      Effect.catchTag("NotAPnpmWorkspaceError", (err) => log(err.message)),
      // File System
      Effect.provide(NodeFileSystem.layer),
      // path config
      Effect.provide(Path.layer),
      Effect.provide(NodeContext.layer),
      Effect.scoped,
    ),
  ),
  Command.withDescription("List all the packages in the pnpm workspace."),
);
