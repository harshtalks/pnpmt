import { Array, Data, Effect, pipe, Predicate, Schema } from "effect";
import { nodeLevelDependencies } from "./deps";
import { fileNames } from "./constants";
import yaml from "yaml";
import {
  PackageJsonSchema,
  packageJsonSchema,
  SelectedCommandSchema,
  selectedCommandSchema,
  yamlSchema,
} from "./schema";
import chalk from "chalk";
import { select, Separator } from "@inquirer/prompts";
import { mind } from "gradient-string";
import { execa } from "execa";
import { Command } from "@effect/platform";
import { workingDirectory } from "@effect/platform/Command";

export class NotAPnpmWorkspaceError extends Data.TaggedError(
  "NotAPnpmWorkspaceError",
) {
  message = `
${chalk.red(chalk.inverse(" ERROR "))}
${chalk.red("✗")} Looks like you're not in a pnpm workspace root.
${chalk.yellow(chalk.bold("ℹ "))} Run this command from the root (where pnpm-workspace.yaml lives).
${chalk.gray("💡")} Tip: ${chalk.bold("pnpm -w")} runs from workspace root automatically.
`.trim();
}

export class NotAPnpmProjectError extends Data.TaggedError(
  "NotAPnpmProjectError",
) {
  message = `
${chalk.red(chalk.inverse(" ERROR "))}
${chalk.red("✗")} Looks like you're not in a pnpm project root.
${chalk.yellow(chalk.bold("ℹ "))} Run this command from a folder with package.json.
${chalk.gray("💡")} Tip: Check with ${chalk.bold("pnpm --version")} or look for pnpm-lock.yaml.
`.trim();
}

export class YamlParseError extends Data.TaggedError("YamlParseError") {}

export class JSONParseError extends Data.TaggedError("JSONParseError") {}

export class CommandFailureError extends Data.TaggedError(
  "CommandFailureError",
) {}

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

// We need to read pnpm-workspace.yml and get the packages
// ideally its either packages
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
  return [""].concat(packages);
});

export const getPackageApps = (packagePath: string) =>
  Effect.gen(function* () {
    const { fs, path } = yield* nodeLevelDependencies;
    const packageJsonPath = path.join(process.cwd(), packagePath);

    return yield* fs.readDirectory(packageJsonPath).pipe(
      Effect.catchTag("SystemError", () => Effect.succeed([])),
      Effect.andThen(
        Array.map((appName) => path.join(process.cwd(), packagePath, appName)),
      ),
    );
  });

// now time to read package.json and get the scrtips
export const getScriptsFromPackageJson = (packagePath: string) =>
  Effect.gen(function* () {
    const { fs, path } = yield* nodeLevelDependencies;
    const packageJsonPath = path.join(packagePath, fileNames.PACKAGE_JSON);

    const content = yield* fs.readFileString(packageJsonPath);

    const packageJsonContent = yield* pipe(
      Effect.try({
        try: () => JSON.parse(content),
        catch: () => new JSONParseError(),
      }),
      Effect.andThen((d) =>
        Schema.decodeUnknown(packageJsonSchema)({
          ...d,
          workingDirectory: packagePath,
        }),
      ),
    );

    return packageJsonContent;
  });

const pkgIcon = "📦 ";
const scriptIcon = "▶️ ";
const spacer = "  ";

const gradientTitle = (text: string) => mind.multiline(text);

export const selectAndRunScript = (scripts: Array<PackageJsonSchema>) =>
  Effect.gen(function* () {
    const pkg = yield* Effect.tryPromise(() =>
      select({
        message: gradientTitle("Select a script to run"),
        choices: scripts.flatMap((pkg, index) => {
          const pkgLabel = `${index === 0 ? "" : "\n"}${pkgIcon}  ${chalk.bold(pkg.name)}\n`;
          const pkgSeparator = new Separator(chalk.magentaBright(pkgLabel));

          const scriptOptions =
            pkg.scripts && Object.entries(pkg.scripts).length > 0
              ? Object.entries(pkg.scripts).map(([key, value]) => ({
                  // clack uses "label" + "value"
                  name:
                    spacer +
                    scriptIcon +
                    " " +
                    chalk.cyan(key) +
                    chalk.dim("  ·  ") +
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
                      spacer + chalk.dim("No scripts defined in this package"),
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

export const runCommand = (cmd: SelectedCommandSchema) =>
  Effect.gen(function* () {
    const { scriptName, workingDirectory } = cmd;
    yield* Command.make("pnpm", "run", scriptName).pipe(
      Command.workingDirectory(workingDirectory),
      Command.stdout("inherit"), // Stream stdout to process.stdout
      Command.exitCode, // Get the exit code
    );
  });
