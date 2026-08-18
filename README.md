# dsh-paste-path

DeepSeek Harness Web 插件：在 Finder 里 **Cmd+C** 复制文件或文件夹后，回到 DSH 按 **Ctrl+V**，把绝对路径插入当前输入框。

普通文字继续用 **Cmd+V**。

## 用法

1. 在 Finder 里选中文件或文件夹，按 `Cmd+C`
2. 回到 DSH Web
3. 输入框工具栏会出现一小块 `Ctrl+V 贴路径`
4. 按 `Ctrl+V` 插入绝对路径

剪贴板不是文件路径时，提示不会出现。

## 安装

本机开发目录：

```sh
dsh plugin --profile web add /Users/jinghuan/code/dsh-paste-path
```

或从 GitHub（推远程后）：

```sh
dsh plugin --profile web add github:<user>/dsh-paste-path
```

装完后重启 `dsh web` 并刷新页面。

## 权限

插件只在 macOS 上生效。Host 会通过 `osascript` 读系统剪贴板里的 `NSFilenamesPboardType`（以及纯文本里的绝对路径），接口仅对本机 loopback / same-origin 开放。

这不是浏览器 Clipboard API，所以普通网页权限弹窗不会出现；本机自动化权限不够时，粘贴会失败。

## 开发

```sh
npm test
```

当前会话里的动态插件 `fpath-1` 是原型。这个仓库是可安装、可重启保留的正式包。
