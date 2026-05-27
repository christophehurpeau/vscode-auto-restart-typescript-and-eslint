# Auto-Restarter: TypeScript, ESLint, Oxlint & Oxfmt Servers

Monitors project configuration and automatically restarts TypeScript, ESLint, Oxlint, and Oxfmt language servers when relevant files change.

## Fork

Fork of [vscode-restart-ts-server-button](https://github.com/neotan/vscode-auto-restart-typescript-eslint-servers) by [Neotan](github.com/neotan).
Changes include:
- Updated globs for eslint/typescript
- Debounce to prevent restarts happening too often
- Added support for Oxlint, Oxfmt, and tsgo (TypeScript Native Preview)

## Make sure `node_modules` are ignored in your watchers

```json
  "files.watcherExclude": {
    "**/node_modules/**": true
  },
```

## Features

- Restart TypeScript, ESLint, Oxlint, Oxfmt, and tsgo servers automatically
- Each server can be independently enabled/disabled
- Configurable file globs per server
- Configurable restart notifications per server

## Supported servers

| Server | Extension required | Default |
|--------|-------------------|---------|
| TypeScript | `vscode.typescript-language-features` (built-in) | `"auto-detect"` |
| ESLint | `dbaeumer.vscode-eslint` | `"auto-detect"` |
| Oxlint | `oxc.oxc-vscode` | `"auto-detect"` |
| Oxfmt | `oxc.oxc-vscode` | `"auto-detect"` |
| tsgo (TypeScript Native Preview) | `TypeScriptTeam.native-preview` | `"auto-detect"` |

Each server's `monitorFilesFor*` setting accepts three values:

- `true` — monitor files; warn if the extension is not found or not active
- `"auto-detect"` — monitor files; silently skip if the extension is not found or not active
- `false` — disable monitoring entirely

## Credits
* [vscode-restart-ts-server-button](https://github.com/neotan/vscode-auto-restart-typescript-eslint-servers) by [Neotan](github.com/neotan)
* [vscode-restart-ts-server-button](https://github.com/qcz/vscode-restart-ts-server-button) by [Qcz](github.com/qcz)
* [vscode-eslint](https://github.com/microsoft/vscode-eslint) by [Microsoft](github.com/microsoft)
