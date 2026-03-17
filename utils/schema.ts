import { Schema } from 'effect';

const NameFromRegexPackage = Schema.transform(
  Schema.NonEmptyString,
  Schema.NonEmptyString,
  {
    strict: true,
    encode: (input) => `${input}/*`,
    decode: (input) => input.replace('/*', ''),
  },
);

export const yamlSchema = Schema.Struct({
  packages: Schema.NonEmptyArray(NameFromRegexPackage).annotations({
    message: () => ({
      message: 'packages must be an array of strings',
      override: true,
    }),
  }),
});

export const packageJsonSchema = Schema.Struct({
  scripts: Schema.Object.annotations({
    message: () => ({
      message: 'scripts must be an object of strings',
      override: true,
    }),
  }),
  name: Schema.NonEmptyString.annotations({
    message: () => ({
      message: 'name must be a string',
      override: true,
    }),
  }),
  workingDirectory: Schema.String.annotations({
    message: () => ({
      message: 'directory must be a string',
      override: true,
    }),
  }),
});

export type PackageJsonSchema = Schema.Schema.Type<typeof packageJsonSchema>;

export const selectedCommandSchema = Schema.Struct({
  pkgName: Schema.NonEmptyString,
  scriptName: Schema.NonEmptyString,
  command: Schema.String,
  workingDirectory: Schema.String,
});

export const selectedCommandsSchema = Schema.Array(selectedCommandSchema);

export const groupedCmdSchema = Schema.Struct({
  name: Schema.NonEmptyString,
  entries: Schema.Array(selectedCommandSchema),
});

export const groupedCmdsSchema = Schema.Array(groupedCmdSchema);

export type SelectedCommandSchema = Schema.Schema.Type<
  typeof selectedCommandSchema
>;

export type SelectedCommandsSchema = Schema.Schema.Type<
  typeof selectedCommandsSchema
>;

export type GroupedCmdSchema = Schema.Schema.Type<typeof groupedCmdSchema>;

export type GroupedCmdsSchema = Schema.Schema.Type<typeof groupedCmdsSchema>;
