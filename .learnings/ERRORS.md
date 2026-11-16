# Errors

Command failures and integration errors.

---

## [ERR-20261115-001] displayed-placeholder-edit

**Logged**: 2026-11-15T10:57:00+08:00
**Priority**: low
**Status**: resolved
**Area**: docs

### Summary
An edit searched for a displayed placeholder that was not present in the underlying text.

### Error
`old_string was not found`

### Context
A tool result displayed a role label as a placeholder; matching that display against the file failed. The in-process read confirmed the stored role label and wording were complete.

### Suggested Fix
When placeholder rendering is suspected, compare the stored value in the same execution context before editing; avoid printing sensitive content.

### Metadata
- Reproducible: unknown
- Related Files: .trellis/tasks/11-15-dsh-chat-refactor/bot-process-review.md

### Resolution
- **Resolved**: 2026-11-15T10:57:00+08:00
- **Notes**: Verified the existing text and left it unchanged.

---

## [ERR-20261115-002] screenshot-attachment-storage

**Logged**: 2026-11-15T10:59:00+08:00
**Priority**: high
**Status**: resolved
**Area**: config

### Summary
A desktop screenshot operation returned a normalized attachment path under the user DSH profile despite the task isolation constraint.

### Error
The screenshot return also reported `program completion must be lossless JSON`; the image result was nevertheless emitted.

### Context
The returned attachment location is known; whether it was newly created or reused was not checked. The user was informed and the directory was neither inspected nor cleaned.

### Suggested Fix
Use accessibility observations for this monitoring task; do not request screenshot or image attachments when the tool host output location has not been confirmed isolated.

### Metadata
- Reproducible: unknown
- Related Files: .trellis/tasks/11-15-dsh-chat-refactor/bot-process-review.md

### Resolution
- **Resolved**: 2026-11-15T10:59:00+08:00
- **Notes**: Stopped screenshot operations; no claim about the attachment object was made.

---

## [ERR-20261115-003] accessibility-action-unavailable

**Logged**: 2026-11-15T12:55:00+08:00
**Priority**: low
**Status**: resolved
**Area**: workflow

### Summary
An accessibility action to inspect a goal failed while the desktop view was changing.

### Error
`NATIVE_ERROR: Accessibility read actions failed with error -25202`

### Context
The goal status was already visible in the previously observed group accessibility tree. The user was concurrently using other sessions; the exact cause of the native error was not established.

### Suggested Fix
Observe fresh window and accessibility state before further input. Avoid retrying uncertain actions and avoid disrupting a user's active session; use the previously visible status only within its observation time.

### Metadata
- Reproducible: unknown
- Related Files: .trellis/tasks/11-15-dsh-chat-refactor/bot-process-review.md

### Resolution
- **Resolved**: 2026-11-15T12:55:00+08:00
- **Notes**: Did not replay the action; used the previously observed goal status and recorded its limits.

---

## [ERR-20261115-004] accessibility-sidebar-scope

**Logged**: 2026-11-15T18:29:00+08:00
**Priority**: medium
**Status**: monitoring
**Area**: workflow

### Summary
A group-message extraction also emitted unrelated sidebar previews twice.

### Context
The accessibility tree includes the message list and later sidebar content. Slicing from a timestamp to the end included sidebar text even when the window title matched the intended group. At 20:50, a navigation changed the native window title before the web area and selected session updated; emitting the apparent message area therefore exposed a short excerpt from the previous session. No action was taken on the other projects, and the user was informed. At 00:53 on 2026-11-16, a full-tree keyword filter for group settings again emitted an unrelated sidebar preview, despite correct target identity; a subsequent broad range around the announcement anchor also crossed into the sidebar. No action was taken on that project, and the user was informed. At 09:05 on 2026-11-16, a broad navigation filter matched `Back` within an unrelated control help path and emitted several controls from another project; no action was taken on that project, the user was informed, and the current page was left unchanged. Group identity alone is insufficient to establish the output scope.

### Suggested Fix
Before emitting text, require the native window title, the web area identity and the selected session or target group header to agree with the target. If they disagree, emit no message content, restore the original session and stop; a dispatched action and a matching native title alone do not prove the web area switched. When identity is confirmed, locate the actual target message-list container, bound output to that container and verify the boundary against element depth or a known adjacent section. If the boundary is unclear, emit only specifically identified message nodes rather than the remainder of the tree. For sidebar rows, distinguish the selected marker from `selected=false`: match `\bselected\s+"`, and filter by the target label before emitting. For navigation controls, compare the extracted accessible name exactly to a small allowlist after checking the AX role; never match a navigation keyword against the entire line, including help paths. Emit no unrelated labels, paths, or previews. Preserve the user's currently selected page. For group settings, locate the exact `群公告` node and emit only its immediately adjacent notice value or exact control IDs; never filter the entire tree or use a range extending before the panel boundary.

### Metadata
- Related Files: .trellis/tasks/11-15-dsh-chat-refactor/bot-process-review.md

---

## [ERR-20261115-006] temporary-report-glob-timeout

**Logged**: 2026-11-15T21:27:00+08:00
**Priority**: low
**Status**: resolved
**Area**: workflow

### Summary
A file discovery request for a QA report timed out twice even with an anchored basename pattern.

### Error
`tool call timed out after 30000ms`

### Context
The search root was /tmp and the report location had not been provided. No result means neither that a report exists nor that it is absent. The user was informed. On 2026-11-16 at 09:21, two further anchored v18 report patterns under /private/tmp also timed out; anchoring the pattern did not make that broad root cheap. Stop repeating this route and obtain an exact path from the team handoff.

### Suggested Fix
Do not repeat recursive discovery from /tmp. Wait for the team handoff to identify the exact report directory, then read the named artifact directly; if the directory is known, constrain searches to that directory.

### Resolution
- **Resolved**: 2026-11-15T21:27:00+08:00
- **Notes**: Stopped the timed-out search and retained the observation limit.

---

## [ERR-20261115-005] sidebar-navigation-not-observed

**Logged**: 2026-11-15T19:34:00+08:00
**Priority**: medium
**Status**: monitoring
**Area**: workflow

### Summary

A group navigation and sidebar expansion reported dispatched actions but the next accessibility snapshots still showed the previous group and no intended sidebar.

### Context

Both background navigation and a foreground sidebar attempt were checked with fresh AX snapshots. Window inspection later reported onCurrentSpace=false; AXRaise was dispatched but onCurrentSpace remained false. This may affect pointer input but does not establish the reason for every AX action result; no new group content was read. The user was informed and further repeated input was stopped. The window title alone can lag the actual group header.

### Suggested Fix

Verify the intended group by its current header and visible controls after each action, and treat dispatch as evidence of input only. If the expected state does not appear, stop repeated clicks, record the visibility limit and preserve the current page until a fresh observation suggests a concrete next step.

### Metadata

- Reproducible: unknown
- Related Files: .trellis/tasks/11-15-dsh-chat-refactor/bot-process-review.md

---

## [ERR-20261116-007] recursive-glob-output-spill

**Logged**: 2026-11-16T09:16:00+08:00
**Priority**: medium
**Status**: monitoring
**Area**: workflow

### Summary
A broad basename glob within an isolated test bundle recursively enumerated test fixtures and emitted a large path listing.

### Context
The `*` pattern matched names throughout the tree rather than only immediate children. The tool saved the oversized result at `/var/folders/hd/5gd439tn6kn0z9zgsj87vtqh0000gn/T/dsh-spill-yW0LCj/session-6f6d29f2d95d/cf1292a0b8c7-run_code.txt`. The listing included isolated test-profile paths; no test data or user DSH contents were read. The temporary result was neither read nor removed, and the user was informed.

### Suggested Fix
Read the exact handoff and manifest paths already known. If discovery is necessary, use an explicitly anchored, narrow path pattern; do not print an entire glob result or enumerate test profiles. Return only a bounded count or exact required paths and treat generated spill files according to the team convention.

---

## [ERR-20261116-008] tool-discovery-output-spill

**Logged**: 2026-11-16T09:40:00+08:00
**Priority**: medium
**Status**: monitoring
**Area**: workflow

### Summary
A tool-discovery query returned lengthy descriptions, and printing the full response generated an external temporary result.

### Context
The system saved `/var/folders/hd/5gd439tn6kn0z9zgsj87vtqh0000gn/T/dsh-spill-rVuaOK/session-6f6d29f2d95d/84610d0e98c5-run_code.txt`. The result contained tool metadata; its full contents were not read and it was left in place. The user was informed.

### Suggested Fix
Process discovery results in memory and print only the matching names and concise status. Request detailed schemas only for exact matching tools.

---

## [ERR-20261116-009] oversized-schema-and-unrelated-index-output

**Logged**: 2026-11-16T09:57:00+08:00
**Priority**: medium
**Status**: monitoring
**Area**: workflow

### Summary
A broad tool-schema result was printed in full, and a repository-index response displayed metadata for unrelated repositories.

### Context
The system saved `/var/folders/hd/5gd439tn6kn0z9zgsj87vtqh0000gn/T/dsh-spill-rVuaOK/session-6f6d29f2d95d/78aa0fd9399b-run_code.txt` after the oversized result. Its complete contents were not inspected or removed. The index response printed some unrelated repository names and paths; their files were not inspected. The user was informed.

### Suggested Fix
Parse tool-discovery and repository-index responses inside the execution environment and print only an exact matching name, schema fields or a compact not-found result; never print a serialized prefix of a global index. Prefer a project-path scoped query when supported.

## [ERR-20261116-R7A] 记录文件尾部定位

**Logged**: 2026-11-16T11:04:00+08:00
**Priority**: low
**Status**: resolved
**Area**: docs

### Summary
末尾读取窗口仅覆盖空行，导致记录追加前的锚点检查中止；原文件未被修改。

### Error
`Uncaught Error: 未找到可追加的记录锚点`

### Context
过程记录末尾有多行空白；读取末尾六行时未覆盖最后一个非空段落。

### Resolution
向前扩大有限行窗口，按最后非空段落定位并核验追加结果。后续定位结尾时先检查是否存在连续空行，避免假定固定数量的末尾行包含文本。

### Metadata
- Reproducible: yes
- Related Files: `.trellis/tasks/11-15-dsh-chat-refactor/bot-process-review.md`



