# dsh-paste-path

English · [简体中文](./README.md) · [Website](https://jhuanxx44.github.io/dsh-paste-path/)

A macOS plugin for DeepSeek Harness Web. Copy files or folders in Finder with **Cmd+C**, return to DSH, then press **Ctrl+V** to insert their absolute paths into the composer.

Normal text paste stays on **Cmd+V**.

## The problem

Copying a file in Finder does not put a plain absolute path on the clipboard. Finder writes a native file-list representation, while a browser editor is deliberately isolated from local filesystem paths. That leaves a small but recurring gap when you want to give a local file path to an agent.

`dsh-paste-path` bridges that gap inside DSH without uploading the file or taking over normal paste.

## Use it

1. Select one or more files or folders in Finder and press `Cmd+C`.
2. Return to DSH Web.
3. When the composer shows the `Ctrl+V Paste path` hint, press `Ctrl+V`.
4. The absolute paths are inserted into the current draft, one per line.

The hint stays hidden when the clipboard does not contain file paths. Duplicate paths already present in the draft are skipped.

## Install

From npm:

```sh
dsh plugin --profile web add dsh-paste-path
```

From GitHub:

```sh
dsh plugin --profile web add github:jhuanxx44/dsh-paste-path
```

For local development:

```sh
dsh plugin --profile web add /absolute/path/to/dsh-paste-path
```

Restart `dsh web` and refresh the page after installation.

- [npm package](https://www.npmjs.com/package/dsh-paste-path)
- [source repository](https://github.com/jhuanxx44/dsh-paste-path)

## How it works

The host plugin reads macOS Pasteboard file-list data (`NSFilenamesPboardType`) through `osascript`. A small DSH client extension checks whether a path is ready and inserts it into the active composer only when you press `Ctrl+V`.

The browser Clipboard API is not used, so the plugin does not trigger a normal website clipboard permission prompt.

## Security boundary

- The plugin only activates on macOS.
- Clipboard endpoints accept loopback connections only.
- Mutating paste requests must be same-origin.
- Clipboard responses are never cached by HTTP.
- Files are not opened or uploaded; only their absolute paths are inserted.
- Ordinary `Cmd+V` behavior is left untouched.

macOS may still deny `osascript` access depending on your local automation permissions. If that happens, grant the relevant permission and try again.

## Remote DSH deployments

The clipboard belongs to the machine running `dsh web`, not necessarily the browser you are using.

- **LAN IP or public hostname:** the host rejects non-loopback clipboard requests with `403`, so the plugin cannot provide your Mac's local paths.
- **SSH port forwarding or a jump host:** the connection still appears as loopback to DSH. The plugin cannot detect the tunnel and would read the remote server's clipboard, not your Mac's clipboard.

If you need to send local files to a remote DSH instance, use an upload-oriented plugin instead. This plugin intentionally solves local path handoff only.

## Develop

Requirements:

- macOS
- Node.js 22 or newer
- DeepSeek Harness Web

Run the checks:

```sh
npm test
```

The earlier in-session plugin named `fpath-1` was the prototype. This repository is the installable, restart-persistent package.

## License

[MIT](./LICENSE)
