import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import { build } from 'esbuild'

const bundle = await build({
  stdin: { contents: "export { ContextMenu, SessionMenuItems } from './src/client/context-menu.js'; export { teamActions } from './src/client/team-actions.js'; export { SHELL_CSS } from './src/client/styles.js'", resolveDir: fileURLToPath(new URL('..', import.meta.url)) },
  bundle: true, format: 'cjs', platform: 'browser', write: false, logLevel: 'silent',
  external: ['react', 'react-dom', '@deepseek-ai/dsh-client-ui-primitives'],
})
let effect = () => {}
let state
let savedRef
let layout = () => {}
let resize
const react = {
  Fragment: 'fragment', createElement: (type, props, ...children) => ({ type, props: props ?? {}, children: children.flat(Infinity) }),
  createContext: initial => ({ value: initial }), useContext: ctx => ctx.value,
  useMemo: fn => fn(), useCallback: fn => fn, useId: () => 'id',
  useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot(),
  useState: initial => [state ?? initial, value => { state = value }], useRef: initial => initial === null && savedRef ? savedRef : { current: initial },
  useEffect: fn => effect(fn), useLayoutEffect: fn => layout(fn),
}
const module = { exports: {} }
const browserWindow = { innerWidth: 1200, innerHeight: 800 }
runInNewContext(bundle.outputFiles[0].text, { module, exports: module.exports, require: name => name === 'react' ? react : {}, document: { activeElement: null }, window: browserWindow, ResizeObserver: class { constructor(fn) { resize = fn } observe() {} disconnect() {} } })
const { ContextMenu, SessionMenuItems, teamActions, SHELL_CSS } = module.exports
const bot = { id: 'bot', sessionId: 'bot-part-2', name: 'Writer' }
const room = { id: 'room', sessionId: 'room-part-2', name: 'Team' }
const roster = { byId: { bot }, roomsById: { room }, agentsById: { agent: { id: 'agent' } }, mainBotIds: [], sections: [] }
const actions = { closeMenu() {}, reportError() {} }
const find = (node, predicate) => {
  if (!node || typeof node !== 'object') return undefined
  if (predicate(node)) return node
  for (const child of node.children ?? []) { const match = find(child, predicate); if (match) return match }
}

test('Bot, group and Agent Session menus capture their actual Session', () => {
  for (const [menu, expected] of [
    [{ kind: 'bot', id: 'bot' }, 'bot-part-2'],
    [{ kind: 'room', id: 'room' }, 'room-part-2'],
    [{ kind: 'agent-session', id: 'agent-session-id', agentId: 'agent', title: 'Chat' }, 'agent-session-id'],
  ]) {
    let tree = ContextMenu({ menu: { ...menu, x: 0, y: 0 }, roster, actions })
    if (menu.kind === 'agent-session') tree = tree.type(tree.props)
    assert.equal(find(tree, node => node.type === SessionMenuItems).props.sessionId, expected)
  }
})

test('extension actions precede dangerous actions, and remain available for Main Bots', () => {
  for (const [menu, menuRoster, expected] of [
    [{ kind: 'bot', id: 'bot' }, roster, ['session', 'danger']],
    [{ kind: 'room', id: 'room' }, roster, ['session', 'danger']],
    [{ kind: 'agent-session', id: 's', agentId: 'agent' }, roster, ['session', 'danger']],
    [{ kind: 'bot', id: 'bot' }, { ...roster, mainBotId: 'bot', mainBotIds: ['bot'] }, ['session']],
    [{ kind: 'agent', id: 'agent' }, roster, ['danger']],
  ]) {
    let tree = ContextMenu({ menu: { ...menu, x: 0, y: 0 }, roster: menuRoster, actions })
    if (menu.kind.startsWith('agent')) tree = tree.type(tree.props)
    const order = []
    const visit = node => {
      if (!node || typeof node !== 'object') return
      if (node.type === SessionMenuItems) order.push('session')
      if (node.type === 'button' && node.props.className === 'bt-danger') order.push('danger')
      for (const child of node.children ?? []) visit(child)
    }
    visit(tree)
    assert.deepEqual(order, expected, menu.kind)
  }
})

test('opening captures the current part before a roster update', () => {
  let snapshot = {}
  let current = 'old-part'
  const ui = { set: fn => { snapshot = fn(snapshot) } }
  const actions = teamActions({ ui, partFor: () => current })
  actions.openMenu({ kind: 'bot', id: 'bot' })
  current = 'new-part'
  const tree = ContextMenu({ menu: { ...snapshot.menu, x: 0, y: 0 }, roster, actions })
  assert.equal(find(tree, node => node.type === SessionMenuItems).props.sessionId, 'old-part')
})

test('long menus are bounded to the viewport and scroll vertically', () => {
  const rule = SHELL_CSS.match(/\.bt-menu\{([^}]+)\}/)?.[1]
  assert.match(rule, /max-height:calc\(100dvh - 16px\)/)
  assert.match(rule, /overflow-y:auto/)
})

test('disabled menu actions are dimmed and do not receive hover styling', () => {
  assert.match(SHELL_CSS, /\.bt-menu button:disabled\{[^}]*opacity:\.35/)
  assert.match(SHELL_CSS, /\.bt-menu button:not\(:disabled\):hover\{background:var\(--bt-hover\)\}/)
})

test('menu stays inside viewport when provider adds rows', () => {
  let height = 100
  savedRef = { current: { getBoundingClientRect: () => ({ width: 200, height }) } }
  layout = fn => fn()
  state = undefined
  ContextMenu({ menu: { kind: 'room', id: 'room', x: 1190, y: 790 }, roster, actions })
  assert.equal(state.left, 992)
  assert.equal(state.top, 692)
  height = 250
  resize()
  assert.equal(state.top, 542)
  savedRef = undefined
  state = undefined
  layout = () => {}
})

test('menus fit a reduced and offset visual viewport', () => {
  browserWindow.visualViewport = { height: 300, offsetTop: 120 }
  savedRef = { current: { getBoundingClientRect: () => ({ width: 200, height: 284 }) } }
  layout = fn => fn()
  const menuRoster = { ...roster, sections: [{ id: 'sec', name: 'Work' }], bots: [bot], rooms: [room] }
  for (const menu of [
    { kind: 'bot', id: 'bot' },
    { kind: 'room', id: 'room' },
    { kind: 'agent-session', id: 's', agentId: 'agent' },
    { kind: 'section', id: 'sec' },
    { kind: 'section-add', id: 'sec' },
  ]) {
    state = undefined
    let tree = ContextMenu({ menu: { ...menu, x: 1190, y: 790 }, roster: menuRoster, actions })
    if (menu.kind.startsWith('agent') || menu.kind.startsWith('section')) tree = tree.type(tree.props)
    assert.equal(tree.props.style.maxHeight, 284, menu.kind)
    assert.equal(state.top, 128, menu.kind)
    assert.equal(state.left, 992, menu.kind)
  }
  delete browserWindow.visualViewport
  state = undefined
  const tree = ContextMenu({ menu: { kind: 'room', id: 'room', x: 0, y: 0 }, roster, actions })
  assert.equal(tree.props.style.maxHeight, 784)
  savedRef = undefined
  state = undefined
  layout = () => {}
})

test('provider receives captured target, updates, selects, and disposes', () => {
  let target, cleanup, listener, selected, disposed = false, closed = false
  const entries = [
    { target: 'session', id: 'native/archive', label: 'Archive' },
    { target: 'ds-bot.session', id: 'provider/action', label: 'Prediction' },
  ]
  const props = { sessionId: 'part-2', displayTitle: 'Team', actions: {
    resolveSessionMenu: value => {
      target = value
      const source = { getSnapshot: () => entries.filter(entry => entry.target === value.kind), subscribe: fn => { listener = fn; return () => { listener = null } } }
      return { source, select: id => { selected = id }, dispose: () => { disposed = true } }
    },
    closeMenu: () => { closed = true },
  } }
  effect = fn => { cleanup = fn() }
  state = undefined
  savedRef = { current: null }
  SessionMenuItems(props)
  assert.equal(target.kind, 'ds-bot.session')
  assert.equal(target.value.sessionId, 'part-2')
  assert.equal(target.value.displayTitle, 'Team')
  assert.equal(typeof listener, 'function')
  effect = () => {}
  const tree = SessionMenuItems(props)
  assert.ok(find(tree, node => node.type === 'span' && node.children.includes('Prediction')))
  assert.equal(find(tree, node => node.type === 'span' && node.children.includes('Archive')), undefined)
  find(tree, node => node.type === 'button').props.onClick()
  assert.equal(selected, 'provider/action')
  assert.equal(closed, true)
  cleanup()
  assert.equal(listener, null)
  assert.equal(disposed, true)
  savedRef = undefined
})

test('disabled parents disable children and empty groups have no action', () => {
  state = [{ id: 'parent', label: 'Group', disabled: true, children: [{ id: 'child', label: 'Child' }] }, { id: 'empty', label: 'Empty', children: [] }]
  const tree = SessionMenuItems({ sessionId: 's', displayTitle: 'S', actions, leaving: false })
  const child = find(tree, node => node.type === 'button')
  assert.equal(child.props.disabled, true)
  assert.equal(find(tree, node => node.type === 'button' && node.children.some(value => value?.children?.includes('Empty'))), undefined)
  state = undefined
})
