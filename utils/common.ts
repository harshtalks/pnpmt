import { Array, Effect, Match, Option, pipe, Predicate, Schema } from 'effect';
import { nodeLevelDependencies } from '../deps';
import { fileNames } from '../constants';
import yaml from 'yaml';
import {
  GroupedCmdSchema,
  groupedCmdSchema,
  GroupedCmdsSchema,
  groupedCmdsSchema,
  packageJsonSchema,
  PackageJsonSchema,
  selectedCommandSchema,
  SelectedCommandSchema,
  selectedCommandsSchema,
  yamlSchema,
} from './schema';
import {
  GroupedCommandNotFound,
  JSONParseError,
  NotAPnpmProjectError,
  NotAPnpmWorkspaceError,
  YamlParseError,
} from './error';
import chalk from 'chalk';
import { select, Separator, checkbox } from '@inquirer/prompts';
import { mind } from 'gradient-string';
import { Command } from '@effect/platform';
import concurrently from 'concurrently';
import { error, log } from 'effect/Console';
import { Options } from '@effect/cli/index';

export const isPnpmWorkspace = Effect.gen(function* () {
  const { fs, path } = yield* nodeLevelDependencies;
  const pnpmWorkspacePath = path.join(process.cwd(), fileNames.PNPM_WORKSPACE);

  return yield* fs
    .exists(pnpmWorkspacePath)
    .pipe(
      Effect.andThen((value) =>
        value
          ? Effect.succeed(true)
          : Effect.fail(new NotAPnpmWorkspaceError()),
      ),
    );
});

export const isPnpmProject = Effect.gen(function* () {
  const { fs, path } = yield* nodeLevelDependencies;
  const pnpmPath = path.join(process.cwd(), fileNames.PNPM);

  return yield* fs
    .exists(pnpmPath)
    .pipe(
      Effect.andThen((value) =>
        value ? Effect.succeed(true) : Effect.fail(new NotAPnpmProjectError()),
      ),
    );
});

export const getPackagesFromWorkspaceConfig = Effect.gen(function* () {
  const { fs, path } = yield* nodeLevelDependencies;

  yield* isPnpmWorkspace;

  const pnpmWorkspacePath = path.join(process.cwd(), fileNames.PNPM_WORKSPACE);

  const content = yield* fs.readFileString(pnpmWorkspacePath);

  const packages = yield* pipe(
    Effect.try({
      try: () => yaml.parse(content),
      catch: () => new YamlParseError(),
    }),
    Effect.andThen(Schema.decode(yamlSchema)),
    Effect.andThen((x) => x.packages),
    Effect.andThen(Effect.forEach(getPackageApps)),
    Effect.andThen((x) => x.flat()),
  );

  // add root too
  return [''].concat(packages);
});

export const getPackageApps = (packagePath: string) =>
  Effect.gen(function* () {
    const { fs, path } = yield* nodeLevelDependencies;
    const packageJsonPath = path.join(process.cwd(), packagePath);

    return yield* fs.readDirectory(packageJsonPath).pipe(
      Effect.catchTag('SystemError', () => Effect.succeed([])),
      Effect.andThen(
        Array.map((appName) => path.join(process.cwd(), packagePath, appName)),
      ),
    );
  });

export const getScriptsFromPackageJson = (packagePath: string) =>
  Effect.gen(function* () {
    const { fs, path } = yield* nodeLevelDependencies;

    const packageJsonPath = path.join(packagePath, fileNames.PACKAGE_JSON);

    const doesExist = yield* fs
      .exists(packageJsonPath)
      .pipe(Effect.catchTag('SystemError', () => Effect.succeed(undefined)));

    if (!doesExist) {
      return undefined;
    }

    const content = yield* fs.readFileString(packageJsonPath);

    const packageJsonContent = yield* pipe(
      Effect.try({
        try: () => JSON.parse(content),
        catch: () => new JSONParseError(),
      }),
      Effect.andThen((d) =>
        Schema.decode(packageJsonSchema)({
          scripts: {},
          ...d,
          workingDirectory: packagePath,
        }),
      ),
    );

    return packageJsonContent;
  });

export const filterAppsWithPackageJson = (
  packages: Array<PackageJsonSchema | undefined>,
) => packages.filter(Predicate.isNotNullable);

const pkgIcon = '📦 ';
const scriptIcon = '▶️ ';
const spacer = '  ';

const gradientTitle = (text: string) => mind.multiline(text);

export const selectAndRunScript = (scripts: Array<PackageJsonSchema>) =>
  Effect.gen(function* () {
    const pkg = yield* Effect.tryPromise(() =>
      select({
        message: gradientTitle('Select a script to run'),
        choices: scripts.flatMap((pkg, index) => {
          const pkgLabel = `${index === 0 ? '' : '\n'}${pkgIcon}  ${chalk.bold(pkg.name)}\n`;
          const pkgSeparator = new Separator(chalk.magentaBright(pkgLabel));

          const scriptOptions =
            pkg.scripts && Object.entries(pkg.scripts).length > 0
              ? Object.entries(pkg.scripts).map(([key, value]) => ({
                  // clack uses "label" + "value"
                  name:
                    spacer +
                    scriptIcon +
                    ' ' +
                    chalk.cyan(key) +
                    chalk.dim('  ·  ') +
                    chalk.gray(value),
                  value: {
                    pkgName: pkg.name,
                    scriptName: key,
                    command: value,
                    workingDirectory: pkg.workingDirectory,
                  },
                }))
              : [
                  {
                    name:
                      spacer + chalk.dim('No scripts defined in this package'),
                    value: null,
                    disabled: true,
                  } as const,
                ];

          return [pkgSeparator, ...scriptOptions];
        }),
      }),
    ).pipe(Effect.andThen(Schema.decodeUnknown(selectedCommandSchema)));

    return pkg;
  });

export const runCommand = (
  cmd: SelectedCommandSchema,
  inputArgs: Option.Option<string[]>,
) =>
  Effect.gen(function* () {
    yield* Effect.tryPromise(
      () =>
        concurrently([
          {
            command: `pnpm run ${cmd.scriptName} ${Option.getOrElse(inputArgs, () => ['']).join(' ')}`,
            cwd: cmd.workingDirectory,
            name: cmd.pkgName,
            prefixColor: 'green',
          },
        ]).result,
    ).pipe(Effect.catchTag('UnknownException', () => Effect.void));
  });

export const getGroupedScripts = (scripts: Array<PackageJsonSchema>) =>
  Effect.gen(function* () {
    const allScriptsMap = pipe(
      scripts,
      Array.reduce(
        new Map<string, Array<SelectedCommandSchema>>(),
        (acc, pkg) => {
          if (pkg.scripts) {
            return pipe(
              Object.entries(pkg.scripts),
              Array.reduce(acc, (map, [name, cmd]) => {
                const group = map.get(name) ?? [];
                return map.set(name, [
                  ...group,
                  {
                    command: cmd,
                    pkgName: pkg.name,
                    workingDirectory: pkg.workingDirectory,
                    scriptName: name,
                  },
                ]);
              }),
            );
          }
          return acc;
        },
      ),
    );

    const grouped = Array.fromIterable(allScriptsMap.entries())
      .map(([name, entries]) => ({ name, entries }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return yield* Schema.decode(groupedCmdsSchema)(grouped);
  });

export const selectGroupedCmd = (
  groupedCmds: GroupedCmdsSchema,
  arg: Option.Option<string>,
) =>
  Effect.gen(function* () {
    if (Option.isSome(arg)) {
      const found = groupedCmds.find(
        (groupedCmd) => groupedCmd.name === arg.value,
      );
      if (found) {
        return yield* Effect.succeed(found);
      } else {
        return yield* new GroupedCommandNotFound({ name: arg.value });
      }
    }

    return yield* Effect.tryPromise(() =>
      select({
        message: gradientTitle('Select a grouped script to run\n'),
        choices: groupedCmds.length
          ? [
              ...groupedCmds.map((groupedCmd) => ({
                name:
                  spacer +
                  chalk.cyan(groupedCmd.name) +
                  chalk.dim('  ·  ') +
                  chalk.gray(
                    groupedCmd.entries.length +
                      ` script${groupedCmd.entries.length > 1 ? 's' : ''}`,
                  ),
                value: groupedCmd,
              })),
              new Separator('\n'),
            ]
          : [
              {
                name:
                  spacer +
                  chalk.dim('No grouped scripts defined in this package'),
                value: null,
                disabled: true,
              } as const,
            ],
      }),
    ).pipe(
      Effect.andThen(Schema.decodeUnknown(groupedCmdSchema)),
      Effect.andThen((value) =>
        Array.findFirst(groupedCmds, (el) => el.name === value.name),
      ),
    );
  });

export const selectItemsFromGroupCmds = (
  groupedCmd: GroupedCmdSchema,
  arg: Option.Option<string>,
  allSelected: boolean,
  inputFlag: Option.Option<string[]>,
) =>
  Effect.gen(function* () {
    const selectedCommands = yield* pipe(
      Match.value({ arg, allSelected }),
      Match.when({ arg: Option.isSome, allSelected: true }, () =>
        Effect.succeed(groupedCmd.entries),
      ),
      Match.orElse(() =>
        Effect.tryPromise(() =>
          checkbox({
            message: gradientTitle('Select a script to run\n'),
            choices: [
              ...groupedCmd.entries.map((entry) => ({
                name:
                  spacer +
                  scriptIcon +
                  ' ' +
                  chalk.cyan(entry.scriptName) +
                  chalk.dim('  ·  ') +
                  chalk.gray(
                    entry.command + spacer + `(${chalk.dim(entry.pkgName)})`,
                  ),
                value: entry,
              })),
              new Separator('\n'),
            ],
          }),
        ).pipe(Effect.andThen(Schema.decodeUnknown(selectedCommandsSchema))),
      ),
    );
    const getColorForPkg = (pkgName: string) => {
      const colors = ['blue', 'green', 'magenta', 'cyan', 'yellow'];
      const hash = pkgName.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
      return colors[hash % colors.length];
    };

    if (!selectedCommands.length) {
      console.log(
        chalk.red(
          chalk.inverse(' ERROR ') +
            chalk.red(' ✗') +
            chalk.red(' No scripts selected'),
        ),
      );
      return;
    }

    const commands = selectedCommands.map(
      ({ scriptName, workingDirectory, pkgName }) => ({
        command:
          'pnpm run ' +
          scriptName +
          ' ' +
          Option.getOrElse(inputFlag, () => ['']).join(' '),
        cwd: workingDirectory,
        name: pkgName,
        prefixColor: getColorForPkg(pkgName) ?? 'grey',
      }),
    );

    yield* Effect.tryPromise(() => concurrently(commands).result).pipe(
      Effect.catchTag('UnknownException', () => Effect.void),
    );
  });

export const selectAppsAndRunCommand = (
  packages: Array<PackageJsonSchema>,
  command: string,
) =>
  Effect.gen(function* () {
    const selectedApps = yield* Effect.tryPromise(() =>
      checkbox({
        message: gradientTitle('Select a the apps to install in\n'),
        choices: packages.map((pkg) => ({
          name: spacer + chalk.cyan(pkg.name) + chalk.gray(' ' + command),
          value: pkg,
        })),
      }),
    );

    const getColorForPkg = (pkgName: string) => {
      const colors = ['blue', 'green', 'magenta', 'cyan', 'yellow'];
      const hash = pkgName.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
      return colors[hash % colors.length];
    };

    if (!selectedApps.length) {
      console.log(
        chalk.red(
          chalk.inverse(' ERROR ') +
            chalk.red(' ✗') +
            chalk.red(' No apps selected'),
        ),
      );
      return;
    }
    const commands = selectedApps.map(
      ({ workingDirectory, name: pkgName }) => ({
        command,
        cwd: workingDirectory,
        name: pkgName,
        prefixColor: getColorForPkg(pkgName) ?? 'grey',
      }),
    );

    yield* Effect.tryPromise(() => concurrently(commands).result).pipe(
      Effect.catchTag('UnknownException', () => Effect.void),
    );
  });
