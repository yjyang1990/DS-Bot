# Errors

Command failures and integration errors.

---

## [ERR-20261115-001] cua_paste

**Logged**: 2026-11-15T01:22:04.172Z
**Priority**: medium
**Status**: resolved
**Area**: tests

### Summary
粘贴接口报告已派发，但界面短暂插入了先前剪贴板文本。

### Context
- 原因尚未确定；观察到的现象并不证明总会发生。
- 在 Bot 职责字段追加内容，失焦后从最新无障碍树核验时发现差异。
- 没有记录剪贴板原文。误插内容已删除。

### Resolution
- 在重新观察到正确的选区后删除误插内容，使用 typeText 输入目标文本。
- 先核对字段内容，再失焦保存并重新打开详情核验。

### Metadata
- Reproducible: unknown
- Pattern-Key: cua.verify-dispatched-input

---
