# dsh-paste-path

[English](./README.md) · 简体中文

DeepSeek Harness Web 插件：在 Finder 里 **Cmd+C** 复制文件或文件夹后，回到 DSH 按 **Ctrl+V**，把绝对路径插入当前输入框。

普通文字继续用 **Cmd+V**。

## 用法

1. 在 Finder 里选中文件或文件夹，按 `Cmd+C`
2. 回到 DSH Web
3. 输入框工具栏会出现一小块 `Ctrl+V 贴路径`
4. 按 `Ctrl+V` 插入绝对路径

剪贴板不是文件路径时，提示不会出现。

## 安装

从 npm：

```sh
dsh plugin --profile web add dsh-paste-path
```

从 GitHub：

```sh
dsh plugin --profile web add github:jhuanxx44/dsh-paste-path
```

本机开发目录：

```sh
dsh plugin --profile web add /Users/jinghuan/code/dsh-paste-path
```

装完后重启 `dsh web` 并刷新页面。

- npm：<https://www.npmjs.com/package/dsh-paste-path>
- 仓库：<https://github.com/jhuanxx44/dsh-paste-path>

## 权限

插件只在 macOS 上生效。Host 会通过 `osascript` 读系统剪贴板里的 `NSFilenamesPboardType`（以及纯文本里的绝对路径），接口仅对本机 loopback / same-origin 开放。

这不是浏览器 Clipboard API，所以普通网页权限弹窗不会出现；本机自动化权限不够时，粘贴会失败。

## 远程部署

剪贴板属于运行 `dsh web` 的那台机器。把 DSH 部署到远程服务器上时：

- **直接通过局域网 IP / 域名访问**：Host 会拒绝非 loopback 的接口请求（403），客户端检测到后自动停用——提示按钮不出现、停止轮询、`Ctrl+V` 行为完全不受影响，也不会误读服务器的剪贴板。
- **SSH 端口转发（`ssh -L 3080:localhost:3080 …`）或跳板机**：连接在 Host 看来仍是本机回环，插件无法区分，此时读到的是**服务器**的剪贴板，不是你本地 Mac 的。这是运行位置决定的，HTTP 层探测不到转发。

需要把本机文件路径贴进远程 DSH 时，插件帮不上忙：请直接在本机运行 DSH，或改用拖拽上传类插件（文件内容随消息进入会话，见 awesome-dsh-plugin 列表的 UI Enhancements 分类）。

## 开发

```sh
npm test
```

当前会话里的动态插件 `fpath-1` 是原型。这个仓库是可安装、可重启保留的正式包。
