// List Command

import { Effect, pipe } from 'effect';
import {
  filterAppsWithPackageJson,
  getPackagesFromWorkspaceConfig,
  getScriptsFromPackageJson,
  isPnpmProject,
  isPnpmWorkspace,
  runCommand,
  selectAndRunScript,
} from '../utils/common';
import { NodeContext, NodeFileSystem } from '@effect/platform-node';
import { Path } from '@effect/platform';
import { log } from 'effect/Console';
import { Args, Command, Options } from '@effect/cli';
import { intro } from '../utils/ui';

const inputFlag = Options.text('input').pipe(
  Options.repeated,
  Options.withAlias('i'),
  Options.withDescription('pass arguments to the script itself'),
  Options.optional,
);

export const listCommand = pipe(
  Command.make('list', { inputFlag }, ({ inputFlag }) =>
    pipe(
      Effect.try(() => intro()),
      Effect.andThen(isPnpmProject),
      Effect.andThen(isPnpmWorkspace),
      Effect.andThen(getPackagesFromWorkspaceConfig),
      Effect.andThen(Effect.forEach(getScriptsFromPackageJson)),
      Effect.andThen(filterAppsWithPackageJson),
      Effect.andThen(selectAndRunScript),
      Effect.andThen((script) => runCommand(script, inputFlag)),
      // Error handling
      Effect.catchTag('NotAPnpmProjectError', (err) => log(err.message)),
      Effect.catchTag('NotAPnpmWorkspaceError', (err) => log(err.message)),
      // File System
      Effect.provide(NodeFileSystem.layer),
      // path config
      Effect.provide(Path.layer),
      Effect.provide(NodeContext.layer),
      Effect.scoped,
    ),
  ),
  Command.withDescription('List all the packages in the pnpm workspace.'),
);
