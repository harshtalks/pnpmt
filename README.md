# PNPMT

PNPMT is a command-line tool for running commands directly in nested packages from the root of a pnpm workspace. It helps streamline development across multi-package monorepos.

## 🚀 Features

- Execute scripts in nested workspace packages from the root.
- List and group packages easily.
- Supports shell completions.
- Configurable log levels and wizard mode.

## 📦 Installation

```bash
pnpm install -g @harshtalks/pnpmt
```

## 🧭 Usage

```bash
$ pnpmt
```

You will see:

```bash
PNPMT v1.0.0

USAGE
  $ pnpmt

DESCRIPTION
  A CLI application for running commands in nested packages directly from the root — works for pnpm workspaces.
```

## 🧩 Commands

```
| Command | Description |
| --- | --- |
| `list` | List all packages in the pnpm workspace. |
| `group [<scriptName> (optional)]` | Group packages by their dependencies. |
```

## Example

```bash
pnpmt list
pnpmt group build
```
