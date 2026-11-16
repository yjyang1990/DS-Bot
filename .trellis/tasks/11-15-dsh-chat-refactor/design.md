# DS Bot 对话重构设计草案

状态：规划；2026-11-15。静态代码和文档分析，尚未完成隔离环境 PoC。此文件中的架构和阶段均为建议，实际交付取决于版本兼容和各阶段验收。

## 结论

建议在现有 DSH 原生会话框架之上，逐个恢复或复用经过验证的 DSH 节点和输入能力；DS Bot 继续承担身份、路由、群聊和数据语义，通过公开插件槽点提供必要扩展。当前插件已经建立在 DSH 会话和槽点之上，不需要先把整个聊天页面替换成另一个会话组件。内嵌视图仅在确有侧栏或其他多视图需求时作为备选 PoC。

版本基线：本机安装的 DSH Desktop 和 DSH 包为 0.2.2-rc.3；查询 npm 时 latest 为 0.2.2-rc.1，next 为 0.2.2-rc.3。项目的测试包和独立桌面应用均固定 rc.1（[测试版本](../../../ds-bot/dev/harness/package.json)、[桌面版本](../../../app/package.json)）。rc.3 是当前安装与 next 发行版本，不应称为 npm latest。两版本类型声明均含 conversation.content 工厂，rc.3 的 child 声明增加了 conversation.hero.frame；声明存在不等于运行时兼容已验证。

## 对照与建议

| 能力 | 静态证据 | 建议 / 待验证点 |
| --- | --- | --- |
| 普通会话、流式回复、历史页和会话作用域 | DSH Session controller 支持打开、retain/release、prompt、队列、取消与历史；其事件流在断线时修复 | 首先在现有主对话中复用；对私聊做 mock PoC，确认切段、重连和释放；retain 保活客户端引用，不保证 host agent 常驻 |
| 原生 Chat/过程视图、工具与图片 | DSH conversation.content 包含 chat、trajectory、消息节点和输入区槽点；见 DSH 的 slots.zh.md 138–200 | 比较现有 Bot 替换节点与原生显示，按行为验收逐个退掉不再需要的覆盖；图片、工具、过程展示及插件 turnTail 均须验证 |
| 输入、附件、队列和交互 | 现有插件仍运行在 DSH composer 上，但覆盖 question、多个 dock 和队列；见 [客户端注册](../../../ds-bot/src/client/index.js#L1102) | 复用可用控件；保留 Bot 问答、模型/成员选择与扩展卡片；现有队列只显示用户发送，不能直接换回把 Bot 投递也列为草稿的默认队列 |
| 长期 Bot 身份与路由 | 一个 Bot 可经历多个 Session；群成员也有各自工作会话；见 [跨段实现](../../../ds-bot/src/host/parts.js#L353) | Bot ID、配置和当前 Session 映射继续由 DS Bot 管理，切段时明确释放旧客户端引用并连接新段 |
| 群聊、消息和成员状态 | 群自己的 Session 中的 group_relay 结果包含账本范围；[群显示](../../../ds-bot/src/client/cells.js#L974)加载账本、活动状态和旧格式回退 | 保留独立群调度、成员身份、账本、实时反馈、排队规则及按锚点显示；不假设单个 DSH Session 原生拼合多个成员 Session |
| 旧消息与跨段历史 | [账本设计](../../../docs/plans/2026-11-10-message-ledger.md#L23)和当前实现支持旧工具结果；EarlierParts 处理跨段 | 同时验证旧数据及历史加载；DSH 的单 Session 分页不能自动证明跨段历史完整 |
| 主页面与可选嵌入 | 两版公开类型均声明 conversation.content；rc.3 内置侧栏实际通过 retain、SessionProvider 和工厂组合会话 | 工厂行为须用公开插件 API、隔离数据实测；主页面已使用原生会话，无须为了重构先加嵌入层；不导入内置侧栏私有组件 |

## 目标边界和数据流

1. DSH 管理 Session 的控制、事件流及本 Session 的原生渲染；DS Bot 通过公开注入服务、生命周期和槽点进行组合。
2. DS Bot 管理 Bot 身份与角色、当前 Session 映射、工具权限和成员协作。Bot 间请求/回复和已送达标记继续走现有 pair 账本与投递流程。
3. 群自己的 Session 继续持有用户发言和 group_relay 锚点，DS Bot 群账本提供锚点范围内的成员消息；群调度独立于 relay。避免把用户消息同时画在 Session 和账本两处。
4. 跨段历史继续由 DS Bot 组织旧段与当前段；当前段自身的历史加载可以使用 DSH 的分页能力，但前提是 PoC 核对顺序、边界和去重。
5. 用户的群停止操作继续调用群工作停止逻辑，不能把输入框的 DSH 单 Session 停止当作等价替代。

### 数据与发送不变量

- 维持 group_relay 的范围锚点、旧结果兼容、群消息顺序和一条用户发言只显示一次；群忙碌时按当前规则合并或排队，不能只靠 UI 猜测轮次。
- Bot 间消息现有投递在适用的 pair 账本上先等待记录落盘，再投递并记录 delivered；见 [delivery.js](../../../ds-bot/src/host/delivery.js#L109)。群账本 append 则先更新内存并按账本排队写盘，见 [ledger.js](../../../ds-bot/src/host/ledger.js#L103)；两种行为不可泛化为同一种同步保证。
- 队列保留用户发送与 Bot 邮件的身份区分；群「全部停止」应停止群工作及其成员工作，而不是只取消群 Session。
- 尽量保持存储格式和既有读取路径。若后续确需改变格式，应单独设计备份、旧数据读取、迁移和回退，使用隔离 fixture 验证后再决定。

## 公开扩展点与限制

- DSH 的 slots 文档声明 conversation.content、conversation.session、conversation.view、conversation.chat.node、composer 和 input dock；可通过插件注册替换或扩展，不通过安装包私有路径导入 React 组件。
- DSH conversation 文档展示为 Session 事件注册自定义 definition 和 keyed chat node；可研究用此机制承载真正属于该 Session 的 Bot 特殊节点。它并不证明可以随意把账本或多个 Session 当作一个原生事件源。
- 现有 [样式](../../../ds-bot/src/client/styles.js#L1090)包含对 _flowItem 等宿主内部类名/结构的选择器，是升级脆弱点。逐项寻找公开槽点或公开样式契约；缺失处保留必要兼容并记录上游接口需求，不修改 DSH。
- 不能仅凭官方侧栏的内部实现推断其组件是公开稳定 API；可借鉴交互流程，但生产代码须通过公开服务与槽点组合。
- DSH 文档尚未证明多 Bot 跨 Session 的统一时间线、群调度和跨段历史可由原生会话直接替代。若 PoC 无法通过上述验收，应保留现有 Bot 群视图和专用节点，并提出具体上游扩展需求。

## 升级风险：输入触发与工作树

- 输入触发菜单的 source 当前只有全局注册，尚未启用按 Session 遮蔽原生 source；DS Bot 自己的候选项可按 Session 过滤，但原生文件/对话来源会并列显示。依据 [at-menu.js](../../../ds-bot/src/client/at-menu.js#L1) 和安装版 [输入触发文档](</Applications/DeepSeek Harness.app/Contents/Resources/app/dsh/node_modules/@deepseek-ai/dsh-client-ui-input-trigger/README.md#L73>)。验收应确认 @Bot、@所有人、原生引用及普通 Agent 会话互不误导；不能假定每个会话都能隐藏任意原生来源。
- DS Bot 在切段后会归档旧 Session：[parts.js](../../../ds-bot/src/host/parts.js#L1031)。安装版 [DSH 升级说明](</Applications/DeepSeek Harness.app/Contents/Resources/app/dsh/node_modules/@deepseek-ai/dsh/docs/upgrade-guide/v0.2.2-rc.1/archive-worktrees/guide.zh.md#L10>)说明：若启用了相关 worktree 服务，归档创建者 Session 时，没有未归档 Session 引用且满足 Git 条件的、由该服务记录创建的工作树可能被非强制删除；分支和提交保留，但被忽略文件及 skip-worktree / assume-unchanged 隐藏的改动可能随目录消失。默认 retainOnArchive 为 false。旧版本之前创建、没有记录事件的工作树不在本次清理范围。
- 这是结合两处已核实行为得到的兼容风险，不代表当前用户的工作树已经受影响，也尚未证明切段后新 Session 是否始终使该目录被引用。应使用独立临时仓库和隔离 Session 验证；如工作树需要保留，按 DSH 公开设置或文档方案处理，不擅自改动用户配置。

## 团队 Bot 评审及采纳

已在真实的「DS Bot 开发与交付」群中邀请项目管理员协调 Developer、QA 与 Reviewer 只读规划；三位成员均已给出评审。群内身份与项目公告已核对，但界面没有显示各 Bot 的创建时间，因此这里不推断哪一位是最近创建的。

- Developer：沿用现有原生 Session/Chat/composer，按语义等价逐项退掉定制；重点核查全局输入触发、内部 CSS 和归档工作树。采纳，见上文及实施计划 0、1、4。
- QA：优先隔离 mock 实证群中多身份、刷新/重启、换段；针对队列、IME、附件、并行批次与待答卡使用现有用例。采纳，按实际受影响范围验证，见实施计划 1–3。
- Reviewer：明确群和 Bot 间两种落盘路径、成员状态与审批、旧数据回退；隔离验证旧版本读取切换后的新增记录。采纳，不把恢复升级前快照等同完整回退；见下文和实施计划。
- Reviewer 建议保留旧视图切换入口。本方案采纳「每阶段可回退」目标，但不预先要求永久并行视图或功能开关；选择版本回退还是临时开关取决于迁移过程和数据兼容验证。
- 管理员的最终汇总确认了上述一致结论，并更正 QA 对升级指南索引的判断：安装版 [升级指南索引](</Applications/DeepSeek Harness.app/Contents/Resources/app/dsh/node_modules/@deepseek-ai/dsh/docs/upgrade-guide/README.md#L7>)存在。归档工作树、macOS 自定义浮层窗口区域、附件错误码及 Session.append 重载应按实际使用逐项检查；完整升级兼容性尚未实测。

## 回退和发布边界

每次只迁移一类节点，保留可回退的旧实现或发布版本，直至对应验收通过。回退前必须在隔离副本验证旧插件和旧 DSH 是否读取候选版本产生的会话及 Bot 数据，保留升级后的数据副本并核对新增记录；仅恢复升级前快照会漏掉升级后的消息。若后续确需改存储格式，再单独设计一致性快照、切换游标、单一写入方和回退处理。先验证 rc.1 基线与 rc.3 候选，再由实际兼容结果决定支持版本和独立桌面应用升级时点。此规划不默认加入永久双实现开关，也不包含数据迁移、发布或修改 DSH。

## 证据与未验证项

- 当前插件覆盖 assistant-step、turn-trigger、tool-call、turn-process、turn-error、question-reply、compaction、context，部分情况下覆盖 user/steering，并保留 DSH turnTail：[index.js](../../../ds-bot/src/client/index.js#L1109)。Agent 模式撤回会话覆盖：[index.js](../../../ds-bot/src/client/index.js#L1165)。
- 安装版公开文档位置：DSH 包的 docs/subsystems/slots.zh.md、conversation.zh.md、web-client.zh.md；会话 API 文档位于 @deepseek-ai/dsh-api-session-controller/README.zh.md。本机安装目录只用于只读分析，不作为产品运行依赖。
- 目前没有在隔离环境运行新旧版本的对比或浏览器行为测试；原生节点与 Bot 身份、旧群历史、工具卡片及输入事件是否完全兼容仍待 PoC。
- 真实 DS Bot Developer、QA、Reviewer 评审均为静态分析，已采纳要点如上；本轮未执行测试。
