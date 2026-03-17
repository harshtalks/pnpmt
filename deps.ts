// Node Level Dependencies
import { FileSystem, Path } from '@effect/platform';
import { Effect } from 'effect';

export const nodeLevelDependencies = Effect.all([
  FileSystem.FileSystem,
  Path.Path,
]).pipe(
  Effect.andThen(([fs, path]) => ({
    fs,
    path,
  })),
);
