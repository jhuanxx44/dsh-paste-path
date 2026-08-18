window.__ModuleLoader__.load({
  id: 'dsh-paste-path',
  factory: (require) => {
    const module = { exports: {} }
    const React = require('react')
    const PEEK_ROUTE = '/dsh-paste-path/peek'
    const PASTE_ROUTE = '/dsh-paste-path/paste'

    const css = [
      '.dshpp-chip{display:inline-flex;align-items:center;height:22px;padding:0 7px;border-radius:999px;color:var(--dsw-alias-label-secondary);font-size:11px;line-height:16px;opacity:.78;user-select:none;white-space:nowrap}',
      '.dshpp-chip kbd{margin:0 2px;padding:0 3px;border:1px solid var(--dsw-alias-border-l2-darkmode-thin);border-radius:3px;font:inherit;opacity:.9}',
      '.dshpp-toast{position:fixed;right:16px;bottom:88px;max-width:360px;padding:8px 12px;border-radius:10px;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);font-size:12px;line-height:18px;pointer-events:auto;box-shadow:var(--dsw-shadow-lv2)}',
      '.dshpp-toast.is-error{background:var(--dsw-alias-interactive-bg-hover-danger);color:var(--dsw-alias-state-error-primary)}',
    ].join('')

    const tagId = 'dsh-paste-path/hint.css'
    if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css=' + JSON.stringify(tagId) + ']') === null) {
      const tag = document.createElement('style')
      tag.dataset.plugin = 'dsh-paste-path'
      tag.dataset.pluginCss = tagId
      tag.textContent = css
      document.head.appendChild(tag)
    }

    let toast = null
    const toastListeners = []
    let toastTimer = null
    let pasteInFlight = false
    let peekReady = false
    const peekListeners = []
    let peekInFlight = false

    function emit(listeners) {
      for (const listener of listeners) listener()
    }

    function showToast(next) {
      toast = next
      if (toastTimer !== null) clearTimeout(toastTimer)
      toastTimer = setTimeout(() => {
        toast = null
        emit(toastListeners)
      }, 3200)
      emit(toastListeners)
    }

    function applyPeek(next) {
      const ready = !!(next && next.ready)
      if (peekReady === ready) return
      peekReady = ready
      emit(peekListeners)
    }

    async function requestJson(path, options) {
      const response = await fetch(path, {
        ...options,
        headers: {
          accept: 'application/json',
          ...(options && options.headers ? options.headers : {}),
        },
      })
      let value
      try {
        value = await response.json()
      } catch {
        throw new Error('dsh-paste-path returned HTTP ' + response.status)
      }
      if (!response.ok) {
        throw new Error(typeof value.error === 'string' ? value.error : 'dsh-paste-path returned HTTP ' + response.status)
      }
      return value
    }

    function refreshPeek() {
      if (peekInFlight) return
      peekInFlight = true
      requestJson(PEEK_ROUTE, { method: 'GET' }).then((result) => {
        peekInFlight = false
        applyPeek(result)
      }, () => {
        peekInFlight = false
        applyPeek({ ready: false })
      })
    }

    function appendDraft(inputActions, draft, nextPaths) {
      const block = nextPaths.join('\n')
      if (!draft) {
        inputActions.setDraft(block)
        return
      }
      const sep = draft.charAt(draft.length - 1) === '\n' ? '' : '\n'
      inputActions.setDraft(draft + sep + block)
    }

    function isPathPaste(event) {
      if (!event || event.isComposing) return false
      if (!event.ctrlKey || event.metaKey || event.altKey) return false
      return typeof event.key === 'string' && event.key.toLowerCase() === 'v'
    }

    function pastePaths(actions, draft, phase) {
      if (!actions) {
        showToast({ error: true, text: '当前没有可写的输入框' })
        return
      }
      if (phase === 'submitting') {
        showToast({ error: true, text: '正在发送，稍后再粘贴路径' })
        return
      }
      if (pasteInFlight) return
      pasteInFlight = true
      requestJson(PASTE_ROUTE, { method: 'POST' }).then((result) => {
        pasteInFlight = false
        const rows = result && Array.isArray(result.paths) ? result.paths : []
        const nextPaths = []
        for (const row of rows) {
          if (row && typeof row.path === 'string') nextPaths.push(row.path)
        }
        if (nextPaths.length === 0) {
          applyPeek({ ready: false })
          showToast({
            error: true,
            text: result && typeof result.error === 'string' ? result.error : '剪贴板里没有文件路径',
          })
          return
        }
        appendDraft(actions, draft, nextPaths)
        applyPeek({ ready: true })
        showToast({
          error: false,
          text: nextPaths.length === 1
            ? '已插入 ' + nextPaths[0]
            : '已插入 ' + String(nextPaths.length) + ' 条绝对路径',
        })
      }, () => {
        pasteInFlight = false
        showToast({ error: true, text: '读取剪贴板失败。请再试一次，或 Option+右键复制路径。' })
      })
    }

    function useShared(listeners, read) {
      const [, setTick] = React.useState(0)
      React.useEffect(() => {
        const fn = () => setTick((n) => n + 1)
        listeners.push(fn)
        return () => {
          const next = listeners.filter((item) => item !== fn)
          listeners.length = 0
          for (const item of next) listeners.push(item)
        }
      }, [])
      return read()
    }

    function PathHint(props) {
      const [node, setNode] = React.useState(null)
      const ready = useShared(peekListeners, () => peekReady)
      const input = props.input
      const actions = props.inputActions
      const draft = input && typeof input.draft === 'string' ? input.draft : ''
      const phase = input && typeof input.phase === 'string' ? input.phase : 'plain'

      React.useEffect(() => {
        if (node === null) return
        const doc = node.ownerDocument
        if (!doc) return
        const onKey = (event) => {
          if (!isPathPaste(event)) return
          event.preventDefault()
          event.stopPropagation()
          pastePaths(actions, draft, phase)
        }
        const onFocus = () => refreshPeek()
        doc.addEventListener('keydown', onKey, true)
        doc.addEventListener('visibilitychange', onFocus)
        return () => {
          doc.removeEventListener('keydown', onKey, true)
          doc.removeEventListener('visibilitychange', onFocus)
        }
      }, [node, actions, draft, phase])

      if (!ready) return React.createElement('span', { ref: setNode, style: { display: 'none' } })
      return React.createElement(
        'span',
        {
          ref: setNode,
          className: 'dshpp-chip',
          title: '剪贴板里有文件路径，按 Ctrl+V 插入绝对路径',
        },
        React.createElement('kbd', null, 'Ctrl'),
        '+',
        React.createElement('kbd', null, 'V'),
        ' 贴路径',
      )
    }

    function ToastOverlay() {
      const current = useShared(toastListeners, () => toast)
      if (current === null) return null
      return React.createElement(
        'div',
        { className: current.error ? 'dshpp-toast is-error' : 'dshpp-toast' },
        current.text,
      )
    }

    function apply(ctx) {
      const slots = ctx.get('slots')
      if (slots === undefined) return
      refreshPeek()
      const peekTimer = setInterval(refreshPeek, 1200)
      ctx.effect(() => () => {
        clearInterval(peekTimer)
        if (toastTimer !== null) clearTimeout(toastTimer)
        toastListeners.length = 0
        peekListeners.length = 0
      })

      slots.inject('conversation.input.left', () => slots.register(
        { name: 'conversation.input.left', id: 'dsh-paste-path', order: 30, label: '路径提示' },
        (props) => React.createElement(PathHint, props),
      ))
      slots.inject('shell.overlay', () => slots.register(
        { name: 'shell.overlay', id: 'dsh-paste-path-toast', order: 80, label: '路径提示' },
        () => React.createElement(ToastOverlay),
      ))
    }

    module.exports = { name: 'dsh-paste-path', apply }
    return module.exports
  },
})
