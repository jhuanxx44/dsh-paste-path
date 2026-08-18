# Changelog

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
