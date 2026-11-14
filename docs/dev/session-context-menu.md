# DS Bot Session menu contributions

DS Bot resolves the optional DSH `contextMenus` service with the target kind `ds-bot.session` when a user opens a Bot, group chat, or DSH Agent Session menu. Its captured value is `{ sessionId, displayTitle }`: `sessionId` is the current DSH Session, not the Bot or group ID. A new conversation part has a new Session ID. The normal DSH sidebar continues to use the `session` target.

Contributors opt in by registering for `ds-bot.session`; actions registered only for `session` are not included. This keeps DSH workspace actions from bypassing DS Bot’s own Session and roster operations. An extension that also supports the native sidebar can register its contribution for both targets. No contribution is required: without the service or a matching action, the existing DS Bot menu stays available.

```js
ctx.inject(['contextMenus'], sub => {
  sub.effect(() => sub.contextMenus.register({
    id: 'example.ds-bot-session',
    target: 'ds-bot.session',
    order: 500,
    resolve: ({ sessionId }) => [{
      id: 'action',
      label: 'Example action',
      run: () => doSomethingForSession(sessionId),
    }],
  }))
})
```

TypeScript extensions can augment `ContextMenuTargetMap` from `@deepseek-ai/dsh-client-ui-context-menu/client` with `'ds-bot.session': { readonly sessionId: SessionId; readonly displayTitle: string }`, importing `SessionId` from `@deepseek-ai/dsh-session/types`. Keep actions appropriate for DS Bot Sessions; use DS Bot’s own operations for changes to Bot, group, and Agent Session membership.

The embedded renderer displays labels, separators, disabled states, and nested actions as indented groups. It does not render contribution icons or shortcut hints. Resolution and action execution remain owned by the DSH `contextMenus` service.
