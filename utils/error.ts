import chalk from 'chalk';
import { Data } from 'effect';

export class NotAPnpmWorkspaceError extends Data.TaggedError(
  'NotAPnpmWorkspaceError',
) {
  override message = `
${chalk.red(chalk.inverse(' ERROR '))}
${chalk.red('✗')} Looks like you're not in a pnpm workspace root.
${chalk.yellow(chalk.bold('ℹ '))} Run this command from the root (where pnpm-workspace.yaml lives).
${chalk.gray('💡')} Tip: ${chalk.bold('pnpm -w')} runs from workspace root automatically.
`.trim();
}

export class NotAPnpmProjectError extends Data.TaggedError(
  'NotAPnpmProjectError',
) {
  override message = `
${chalk.red(chalk.inverse(' ERROR '))}
${chalk.red('✗')} Looks like you're not in a pnpm project root.
${chalk.yellow(chalk.bold('ℹ '))} Run this command from a folder with package.json.
${chalk.gray('💡')} Tip: Check with ${chalk.bold('pnpm --version')} or look for pnpm-lock.yaml.
`.trim();
}

export class YamlParseError extends Data.TaggedError('YamlParseError') {}

export class JSONParseError extends Data.TaggedError('JSONParseError') {}

export class CommandFailureError extends Data.TaggedError(
  'CommandFailureError',
) {}

export class CommandExecutionError extends Data.TaggedError(
  'CommandExecutionError',
) {}

export class GroupedCommandNotFound extends Data.TaggedError(
  'GroupedCommandNotFound',
)<{ name: string }> {
  override message = chalk.red(
    chalk.inverse(' ERROR ') +
      chalk.red(' ✗') +
      chalk.red(' No grouped script found with name ') +
      chalk.cyan(this.name),
  );
}
