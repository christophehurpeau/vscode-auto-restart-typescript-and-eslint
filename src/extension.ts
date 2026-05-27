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

const debounceWithDoubleTimeIfLastCallNear = function (
  func: (...args: any[]) => void,
  wait: number
) {
  let timeout: NodeJS.Timeout | undefined
  let lastCallTime: number | undefined
  const maxWait = wait * 2

  return function (...args: any[]) {
    const later = () => {
      timeout = undefined
      lastCallTime = Date.now()
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }

    const now = Date.now()
    const timeSinceLastCall = lastCallTime ? now - lastCallTime : null

    if (timeSinceLastCall && timeSinceLastCall >= maxWait) {
      timeout = setTimeout(later, wait * 2)
    } else {
      timeout = setTimeout(later, wait)
    }

  }
}

type WatcherKey =
  'Shared' | 'Typescript' | 'ESLint' | 'Oxlint' | 'Oxfmt' | 'TSGo'
type MonitorMode = true | 'auto-detect' | false
type MonitorKey = Extract<keyof ConfigProperties, `monitorFilesFor${string}`>
type NotificationKey =
  Extract<keyof ConfigProperties, `showRestartNotificationFor${string}`>

type ConfigProperties = {
  monitorFilesForTypescript: MonitorMode
  monitorFilesForESLint: MonitorMode
  monitorFilesForOxlint: MonitorMode
  monitorFilesForOxfmt: MonitorMode
  monitorFilesForTSGo: MonitorMode
  fileGlobForShared: GlobPattern[]
  fileGlobForTypescript: GlobPattern[]
  fileGlobForESLint: GlobPattern[]
  fileGlobForOxlint: GlobPattern[]
  fileGlobForOxfmt: GlobPattern[]
  fileGlobForTSGo: GlobPattern[]
  showRestartNotificationForTypescript: boolean
  showRestartNotificationForESLint: boolean
  showRestartNotificationForOxlint: boolean
  showRestartNotificationForOxfmt: boolean
  showRestartNotificationForTSGo: boolean
}

const TS_EXT_ID = 'vscode.typescript-language-features'
const ESLINT_EXT_ID = 'dbaeumer.vscode-eslint'
const Oxlint_EXT_ID = 'oxc.oxc-vscode'
const TSGO_EXT_ID = 'TypeScriptTeam.native-preview'
const THIS_EXT_NAME = 'vscode-auto-restart-linters'
const THIS_EXT_ID = `chrp.${THIS_EXT_NAME}`
const THIS_EXT_CONFIG_PREFIX = `autoRestart` // i.e. Configuration `section`

let sharedWatcher: Disposable
let tsWatcher: Disposable
let eslintWatcher: Disposable
let OxlintWatcher: Disposable
let OxfmtWatcher: Disposable
let tsgoWatcher: Disposable

export function activate(context: ExtensionContext) {
  const debouncedRestart = (fn: () => void) =>
    debounceWithDoubleTimeIfLastCallNear(fn, 2000)

  const restartTs = debouncedRestart(makeRestartFn(
    TS_EXT_ID, 'monitorFilesForTypescript',
    'typescript.restartTsServer',
    'showRestartNotificationForTypescript', 'TypeScript',
  ))
  const restartEslint = debouncedRestart(makeRestartFn(
    ESLINT_EXT_ID, 'monitorFilesForESLint',
    'eslint.restart',
    'showRestartNotificationForESLint', 'ESLint',
  ))
  const restartOxlint = debouncedRestart(makeRestartFn(
    Oxlint_EXT_ID, 'monitorFilesForOxlint',
    'oxc.restartServer',
    'showRestartNotificationForOxlint', 'Oxlint',
  ))
  const restartOxfmt = debouncedRestart(makeRestartFn(
    Oxlint_EXT_ID, 'monitorFilesForOxfmt',
    'oxc.restartServerFormatter',
    'showRestartNotificationForOxfmt', 'Oxfmt',
  ))
  const restartTSGo = debouncedRestart(makeRestartFn(
    TSGO_EXT_ID, 'monitorFilesForTSGo',
    'typescript.native-preview.restart',
    'showRestartNotificationForTSGo', 'tsgo',
  ))

  function setupWatchers() {
    sharedWatcher?.dispose()
    tsWatcher?.dispose()
    eslintWatcher?.dispose()
    OxlintWatcher?.dispose()
    OxfmtWatcher?.dispose()
    tsgoWatcher?.dispose()

    sharedWatcher = initWatcher('Shared', () => {
      restartTs()
      restartEslint()
      restartOxlint()
      restartOxfmt()
      restartTSGo()
    })

    if (getConfig('monitorFilesForTypescript')) {
      tsWatcher = initWatcher('Typescript', restartTs)
    }
    if (getConfig('monitorFilesForESLint')) {
      eslintWatcher = initWatcher('ESLint', restartEslint)
    }
    if (getConfig('monitorFilesForOxlint')) {
      OxlintWatcher = initWatcher('Oxlint', restartOxlint)
    }
    if (getConfig('monitorFilesForOxfmt')) {
      OxfmtWatcher = initWatcher('Oxfmt', restartOxfmt)
    }
    if (getConfig('monitorFilesForTSGo')) {
      tsgoWatcher = initWatcher('TSGo', restartTSGo)
    }
  }

  workspace.onDidChangeConfiguration((e) => {
    // Re-initiate the watchers might be overkill when any configuration
    // changed, but it's the easiest way to make sure the watchers are
    // up-to-date with the latest configuration.
    if (e.affectsConfiguration(THIS_EXT_CONFIG_PREFIX)) {
      setupWatchers()
    }
  })

  setupWatchers()
}

export function deactivate() {
  sharedWatcher?.dispose()
  tsWatcher?.dispose()
  eslintWatcher?.dispose()
  OxlintWatcher?.dispose()
  OxfmtWatcher?.dispose()
  tsgoWatcher?.dispose()
  console.log(`Extension ${THIS_EXT_ID} is now deactivated!`)
}

// ===== Utils =====

function getConfig<K extends keyof ConfigProperties>(
  property: K): ConfigProperties[K] {
  return workspace.getConfiguration(THIS_EXT_CONFIG_PREFIX).get(property)!
}

function makeRestartFn(
  extId: string,
  monitorKey: MonitorKey,
  command: string,
  notificationKey: NotificationKey,
  label: string,
) {
  return function () {
    const mode = getConfig(monitorKey)
    if (!mode) { return }
    const ext = extensions.getExtension(extId)
    if (!ext || !ext.isActive) {
      if (mode === true) {
        window.showWarningMessage(
          `${label} extension is not installed or not active.`
        )
      }
      return
    }
    return commands.executeCommand(command).then(() => {
      if (getConfig(notificationKey)) {
        window.showInformationMessage(`${label} Server Restarted`)
      }
    })
  }
}

function initWatcher(
  watcherName: WatcherKey,
  cb: () => Thenable<unknown> | void
): Disposable {
  const globs = getConfig(`fileGlobFor${watcherName}`)

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
