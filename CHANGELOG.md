# Changelog

## 0.1.2

- Fix a startup race where the host routes never registered when the `webServer` service activated after the plugin: a one-shot `ctx.get()` that silently returned on `undefined` let the plugin die without any error. Routes now register through `ctx.inject()`, which waits for the service and re-registers if it restarts.
- Detect the host's `remote-not-supported` (403) peek response and disable the plugin on remote deployments: stop polling, keep the hint hidden, leave Ctrl+V untouched.
- Tag the loopback 403 response with a structured `code` so clients can tell it apart from transient failures.
- Document remote-deployment behavior (LAN access vs. SSH port forwarding) in the README.

## 0.1.1

- Leave ordinary Ctrl+V alone unless the clipboard is a file-path copy.
- Ignore mixed text that only mentions a path.
- Reuse clipboard reads until the pasteboard change count moves.
- Time out a stuck `osascript` instead of hanging the host.
- Stop polling while the browser tab is hidden.
- Skip paths already present in the draft.
- Keep the last hint if a peek request fails.
- Keep tests out of the published tarball.

## 0.1.0

- First public release: Finder Cmd+C, then Ctrl+V in the DSH composer.
