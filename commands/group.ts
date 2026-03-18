import { Args, Command, Options } from '@effect/cli';
import { Effect, pipe } from 'effect';
import { intro } from '../utils/ui';
import {
  filterAppsWithPackageJson,
  getGroupedScripts,
  getPackagesFromWorkspaceConfig,
  getScriptsFromPackageJson,
  isPnpmProject,
  isPnpmWorkspace,
  selectGroupedCmd,
  selectItemsFromGroupCmds,
} from '../utils/common';
import { log } from 'effect/Console';
import { NodeContext, NodeFileSystem } from '@effect/platform-node';
import { Path } from '@effect/platform';

const text = Args.text({ name: 'scriptName' }).pipe(
  Args.withDescription('The name of the grouped script to run'),
  Args.optional,
);

const allFlag = Options.boolean('all').pipe(
  Options.withAlias('a'),
  Options.withDescription('Run all grouped scripts'),
  Options.withDefault(false),
);

const inputFlag = Options.text('input').pipe(
  Options.repeated,
  Options.withAlias('i'),
  Options.withDescription('pass arguments to the script itself'),
  Options.optional,
);

export const groupCommand = Command.make(
  'group',
  { text, allFlag, inputFlag },
  ({ text, allFlag, inputFlag }) =>
    pipe(
      Effect.try(() => intro()),
      Effect.andThen(isPnpmProject),
      Effect.andThen(isPnpmWorkspace),
      Effect.andThen(getPackagesFromWorkspaceConfig),
      Effect.andThen(Effect.forEach(getScriptsFromPackageJson)),
      Effect.andThen(filterAppsWithPackageJson),
      Effect.andThen(getGroupedScripts),
      Effect.andThen((groupedScripts) =>
        selectGroupedCmd(groupedScripts, text),
      ),
      Effect.andThen((groupedCmd) =>
        selectItemsFromGroupCmds(groupedCmd, text, allFlag, inputFlag),
      ),
      // Error handling
      Effect.catchTag('NotAPnpmProjectError', (err) => log(err.message)),
      Effect.catchTag('NotAPnpmWorkspaceError', (err) => log(err.message)),
      Effect.catchTag('GroupedCommandNotFound', (err) => log(err.message)),
      // File System
      Effect.provide(NodeFileSystem.layer),
      // path config
      Effect.provide(Path.layer),
      Effect.provide(NodeContext.layer),
      Effect.scoped,
    ),
).pipe(Command.withDescription('Group packages by their dependencies.'));
