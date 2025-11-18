import {
  commands,
  Disposable,
  ExtensionContext,
  extensions,
  GlobPattern,
  Uri,
  window,
  workspace,
} from 'vscode'

const debounce = function (func: (...args: any[]) => void, wait: number) {
  let timeout: NodeJS.Timeout | undefined
  return function (...args: any[]) {
    const later = () => {
      timeout = undefined
      func(...args)
    }
    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

type ConfigProperties = {
  monitorFilesForTypescript: boolean
  monitorFilesForESLint: boolean
  fileGlobForTypescript: GlobPattern[]
  fileGlobForESLint: GlobPattern[]
  showRestartNotificationForTypescript: boolean
  showRestartNotificationForESLint: boolean
}

const TS_EXT_ID = 'vscode.typescript-language-features'
const ESLINT_EXT_ID = 'dbaeumer.vscode-eslint'
const THIS_EXT_NAME = 'vscode-auto-restart-typescript-and-eslint'
const THIS_EXT_ID = `chrp.${THIS_EXT_NAME}`
const THIS_EXT_CONFIG_PREFIX = `autoRestart` // i.e. Configuration `section`

let tsWatcher: Disposable
let eslintWatcher: Disposable

export function activate(context: ExtensionContext) {
  const debouncedRestartTsServer = debounce(restartTsServer, 2000)
  const debouncedRestartEslintServer = debounce(restartEslintServer, 2000)

  workspace.onDidChangeConfiguration((e) => {

    // Re-initiate the watchers might be overkill when any configuration
    // changed, but it's the easiest way to make sure the watchers are
    // up-to-date with the latest configuration.
    if (e.affectsConfiguration(THIS_EXT_CONFIG_PREFIX)) {
      tsWatcher?.dispose()
      eslintWatcher?.dispose()

      if (getConfig('monitorFilesForTypescript')) {
        tsWatcher = initWatcher('Typescript', debouncedRestartTsServer)
      }

      if (getConfig('monitorFilesForESLint')) {
        eslintWatcher = initWatcher('ESLint', debouncedRestartEslintServer)
      }
    }
  })

  if (getConfig('monitorFilesForTypescript')) {
    tsWatcher = initWatcher('Typescript', debouncedRestartTsServer)
  }

  if (getConfig('monitorFilesForESLint')) {
    eslintWatcher = initWatcher('ESLint', debouncedRestartEslintServer)
  }
}

export function deactivate() {
  tsWatcher?.dispose()
  eslintWatcher?.dispose()
  console.log(`Extension ${THIS_EXT_ID} is now deactivated!`)
}

// ===== Utils =====

function getConfig<K extends keyof ConfigProperties>(
  property: K): ConfigProperties[K] {
  return workspace.getConfiguration(THIS_EXT_CONFIG_PREFIX).get(property)!
}

function restartTsServer() {
  const tsExtension = extensions.getExtension(TS_EXT_ID)
  if (!tsExtension || tsExtension.isActive === false) {
    window.showWarningMessage(`${THIS_EXT_NAME} is not active or not running.`)
    return
  }

  return commands.executeCommand("typescript.restartTsServer").then(() => {
    if (getConfig(`showRestartNotificationForTypescript`)) {
      window.showInformationMessage(
        `Typescript Server Restarted`
      )
    }
  })
}

function restartEslintServer() {
  const eslintExtension = extensions.getExtension(ESLINT_EXT_ID)
  if (!eslintExtension || eslintExtension.isActive === false) {
    window.showWarningMessage("ESLint extension is not active or not running.")
    return
  }

  return commands.executeCommand("eslint.restart").then(() => {
    if (getConfig(`showRestartNotificationForESLint`)) {
      window.showInformationMessage(
        `ESLint Server Restarted`
      )
    }
  })
}

function initWatcher(
  extension: 'Typescript' | 'ESLint',
  cb: () => Thenable<unknown> | void
): Disposable {
  let globs = getConfig(`fileGlobFor${extension}`)

  function createEventHandler(type: string) {
    return async (e: Uri) => {
      const filePath = e.path || e.fsPath
      try {
        await cb()
      } catch (err) {
        throw new Error(
          `Failed to restart server when the file "${filePath}" was ${type}`,
          { cause: err }
        )
      }
    }
  }

  const watchers = globs.map(glob => {
    const watcher = workspace.createFileSystemWatcher(glob, false, false, false)
    watcher.onDidCreate(createEventHandler('created'))
    watcher.onDidChange(createEventHandler('changed'))
    watcher.onDidDelete(createEventHandler('deleted'))
    return watcher
  })

  return Disposable.from(...watchers)
}
