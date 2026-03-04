# Auto-Restarter: TypeScript & eslint Servers

Monitors project configuration and automatically restarts TypeScript and eslint language servers when relevant files change.
<img src="https://raw.githubusercontent.com/christophehurpeau/vscode-auto-restart-typescript-and-eslint/master/images/alt-banner.png" alt="Banner" />

## Fork

Fork of [vscode-restart-ts-server-button](https://github.com/neotan/vscode-auto-restart-typescript-eslint-servers) by [Neotan](github.com/neotan).
Changes includes :
- Updated globs for eslint/typescript
- Debounce to prevents restarts happening too often

## Make sure `node_modules` are ignored in your watchers

```json
  "files.watcherExclude": {
    "**/node_modules/**": true
  },
```

## Features
- Restart TypeScript and eslint servers automatically
- Enable/Disable file monitoring

## Credits
* [vscode-restart-ts-server-button](https://github.com/neotan/vscode-auto-restart-typescript-eslint-servers) by [Neotan](github.com/neotan)
* [vscode-restart-ts-server-button](https://github.com/qcz/vscode-restart-ts-server-button) by [Qcz](github.com/qcz)
* [vscode-eslint](https://github.com/microsoft/vscode-eslint) by [Microsoft](github.com/microsoft)
 
