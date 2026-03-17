import { Args, Command } from '@effect/cli';
import { Path } from '@effect/platform';
import { NodeContext, NodeFileSystem } from '@effect/platform-node';
import { Effect, pipe } from 'effect';
import { log } from 'effect/Console';
import {
  filterAppsWithPackageJson,
  getPackagesFromWorkspaceConfig,
  getScriptsFromPackageJson,
  isPnpmProject,
  isPnpmWorkspace,
  selectAppsAndRunCommand,
} from '../utils/common';
import { intro } from '../utils/ui';

const text = Args.text({ name: 'packageName' }).pipe(
  Args.withDescription('The name of the package to be added'),
);

export const addCommand = Command.make('add', { text }, ({ text }) =>
  pipe(
    Effect.try(() => intro()),
    Effect.andThen(isPnpmProject),
    Effect.andThen(isPnpmWorkspace),
    Effect.andThen(getPackagesFromWorkspaceConfig),
    Effect.andThen(Effect.forEach(getScriptsFromPackageJson)),
    Effect.andThen(filterAppsWithPackageJson),
    Effect.andThen((packages) =>
      selectAppsAndRunCommand(packages, ' pnpm install ' + text),
    ),
    Effect.catchTag('NotAPnpmProjectError', (err) => log(err.message)),
    Effect.catchTag('NotAPnpmWorkspaceError', (err) => log(err.message)),

    // File System
    Effect.provide(NodeFileSystem.layer),
    // path config
    Effect.provide(Path.layer),
    Effect.provide(NodeContext.layer),
    Effect.scoped,
  ),
);
