// List Command

import { Effect, pipe } from "effect";
import {
  getPackagesFromWorkspaceConfig,
  getScriptsFromPackageJson,
  isPnpmProject,
  isPnpmWorkspace,
  runCommand,
  selectAndRunScript,
} from "../utils/common";
import { NodeContext, NodeFileSystem } from "@effect/platform-node";
import { Path } from "@effect/platform";
import { log } from "effect/Console";
import { Command } from "@effect/cli";
import { intro } from "../utils/ui";

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
