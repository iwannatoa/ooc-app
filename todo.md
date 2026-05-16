# 产品需求 backlog（未完成项）

> 状态说明：本文仅跟踪未完成需求。现有契约与数据结构基线请参考 [`docs/architecture.md`](docs/architecture.md)。

## 0. 约定

- 编号规则：`REQ-<域>-<序号>`，域包含 `NAR`、`AI`、`DAT`、`A11Y`、`OBS`、`QA`。
- 每条需求固定包含：背景/问题、范围、用户可见行为、技术要点（高层）、验收标准（DoD）、依赖。
- 需求默认为 Pending；仅在功能可演示且通过对应自动化验证后视为完成。

## 0.5 执行顺序（按依赖拓扑，建议实现队列）

以下顺序满足「前置项在序号更靠前」；**同序号内可并行**（无箭头相连即互不阻塞）。最后一条 `REQ-QA-002` 为质量门禁，在各域具备可测功能后持续扩充用例。

**执行列表（checkbox；同编号可并行）**

- [x] `[1] REQ-AI-003`：Provider 能力矩阵接入运行时，为多模态降级与测试分叉打底。
- [x] `[1] REQ-QA-001`：长列表性能与动态高度，可与 `REQ-AI-003` 并行，减轻后续叙事/附件联调成本。
- [x] `[2] REQ-OBS-001`：统一日志字段与诊断脱敏，先于重度数据导出/备份向导落地更安全。
- [ ] `[3] REQ-DAT-001`：Profile 级数据根路径隔离，为加密包与 bundle 路径语义奠基。
- [ ] `[4] REQ-DAT-002`：备份/恢复向导与加密包（依赖稳定路径与脱敏策略）。
- [ ] `[5] REQ-AI-002`：Multimodal 全链路（依赖能力矩阵已生效）。
- [ ] `[6] REQ-AI-001`：Context trace 与策略调节（依赖多模态/请求链路上下文已稳定时收益最大）。
- [ ] `[7] REQ-NAR-005`：Genre presets 一键应用（可与 `REQ-NAR-001` 并行，便于测试分块）。
- [ ] `[7] REQ-NAR-001`：分支树与 savepoint 恢复闭环。
- [ ] `[8] REQ-NAR-002`：变体 diff 与显式回滚（依赖分支/版本数据模型稳定）。
- [ ] `[9] REQ-NAR-003`：服务端 PDF 导出。
- [ ] `[10] REQ-NAR-004`：服务端 project bundle 与校验矩阵（依赖 profile 路径与观测脱敏）。
- [ ] `[11] REQ-A11Y-001`：a11y 与 axe/Playwright 扩面（在主要 UI 变更收敛后集中收口）。
- [ ] `[12] REQ-QA-002`：关键路径 E2E + 迁移 dry-run/down 演练，持续集成直至发布门禁。

## 1. 叙事体验（Narrative）

### REQ-NAR-001 分支树与 savepoint 恢复闭环

- 背景/问题：当前已有分支/savepoint 基础 API 与入口，但缺完整叙事状态闭环。
- 范围：实现章节树可视化、任意节点建分支、从 savepoint 恢复后继续生成。
- 用户可见行为：用户可在 UI 中查看分支关系、创建分支、创建并恢复 savepoint，恢复后可继续生成新内容。
- 技术要点（高层）：`src/components/story`、`src/components/chat/ChatControls.tsx`、`server/src/service/chat_service.py`、`server/src/controller/chat_controller.py`。
- 验收标准（DoD）：
  - 可以稳定跑通“生成 -> 分支 -> savepoint -> 恢复 -> 继续生成”。
  - 至少 1 条组件测试或 e2e 覆盖该闭环。
- 依赖：无（用例在 `REQ-QA-002` 阶段汇总进发布门禁）。

### REQ-NAR-002 变体双栏 diff 与显式回滚

- 背景/问题：当前回滚流程偏启发式，无法精确比较和选择目标版本。
- 范围：提供双栏 diff 视图、候选 variant 列表、显式目标选择回滚。
- 用户可见行为：用户可选任意两个版本比较差异，并指定目标版本执行回滚。
- 技术要点（高层）：`src/components/chat/ChatControls.tsx`、`src/components/story`、`src/api/conversationApi.ts`。
- 验收标准（DoD）：
  - 回滚目标由用户显式确认，不再使用隐式“最近可用”策略。
  - 至少 1 条组件测试覆盖 diff 展示与回滚动作。
- 依赖：`REQ-NAR-001`。

### REQ-NAR-003 PDF 导出能力（服务端）

- 背景/问题：当前仅有文本/JSON 导出能力，缺正式排版的 PDF 产物。
- 范围：提供 `POST /api/export/pdf` 或等价服务端能力，支持章节目录与元数据页。
- 用户可见行为：用户在导出入口选择 PDF 后可生成并下载可阅读的文档。
- 技术要点（高层）：`server/src/controller`、`src/components/chat/ChatControls.tsx`、`src-tauri` 文件保存链路。
- 验收标准（DoD）：
  - 导出的 PDF 包含目录与基础元数据。
  - 至少 1 条接口测试 + 1 条 e2e 覆盖导出成功路径。
- 依赖：无（执行顺序上建议在叙事主链稳定后接 e2e，见 §0.5）。

### REQ-NAR-004 服务端 project bundle 与校验矩阵

- 背景/问题：当前 bundle 主要由客户端导出，缺服务端统一版本与完整性校验路径。
- 范围：实现 `POST /api/export/project-bundle`（或等价）与版本/校验矩阵。
- 用户可见行为：用户可导出可回放 bundle，导入时获得明确版本与完整性反馈。
- 技术要点（高层）：`server/src/controller`、`server/src/service`、`src/components/chat/ChatControls.tsx`。
- 验收标准（DoD）：
  - bundle 导出与导入校验规则可重复执行且结果一致。
  - 覆盖版本不匹配与完整性失败的错误返回。
- 依赖：`REQ-DAT-001`、`REQ-OBS-001`。

### REQ-NAR-005 Genre presets 一键应用与可撤销

- 背景/问题：现有模板能力缺完整“一键全应用 + 撤销”体验。
- 范围：支持角色、提纲、参数模板的批量应用，以及撤销或确认机制。
- 用户可见行为：用户点击一次即可套用 preset，并可撤销误操作。
- 技术要点（高层）：`src/components/story/ConversationSettingsForm`、`src/store/slices`。
- 验收标准（DoD）：
  - preset 一键应用覆盖角色/提纲/参数至少三类字段。
  - 至少 1 条组件测试覆盖应用与撤销。
- 依赖：无。

## 2. AI 与后端（AI & Backend）

### REQ-AI-001 Context Management 前端可视化与策略调节

- 背景/问题：后端已有上下文裁剪与预算逻辑，但前端缺 trace 可见性与策略入口。
- 范围：提供上下文层级、token 预算、摘要刷新策略的可视化与调参入口。
- 用户可见行为：用户可查看当前上下文构成、预算占用，并调整策略参数。
- 技术要点（高层）：`src/hooks`、`src/components`、`server/src/utils/story_context_selection.py`。
- 验收标准（DoD）：
  - 可视化信息与后端实际策略一致。
  - 至少 1 条单测或组件测试覆盖策略变更对请求参数的影响。
- 依赖：`REQ-AI-002`（建议在多模态与主聊天链路稳定后接 trace，避免重复返工）。

### REQ-AI-002 Multimodal 完整链路落地

- 背景/问题：当前仅支持 JSON `message_parts` 与元数据持久化，尚非完整多模态。
- 范围：实现 multipart 上传、附件落盘与路径隔离、LangChain parts 转换、UI 附件卡片、失败重试、降级提示。
- 用户可见行为：用户可上传附件并看到预览/状态；provider 不支持时有明确降级提示。
- 技术要点（高层）：`src/components/chat/ChatInput.tsx`、`src/components/chat/MessageList.tsx`、`server/src/controller/chat_controller.py`、`server/src/infrastructure/langchain_*`。
- 验收标准（DoD）：
  - 文本+附件消息可端到端发送与持久化。
  - 上传失败可重试；不支持 provider 路径可观测且可提示。
  - 至少 1 条 controller 测试 + 1 条 e2e 覆盖。
- 依赖：`REQ-AI-003`、`REQ-QA-002`。

### REQ-AI-003 Provider 能力矩阵与运行时打通

- 背景/问题：能力矩阵字段已扩展，但运行时分支与测试覆盖尚不完整。
- 范围：将 `supports_multimodal` 等字段完整接入请求处理与降级策略。
- 用户可见行为：不同 provider 在 UI 和响应行为上符合其能力声明。
- 技术要点（高层）：`server/src/infrastructure/provider_capabilities.py`、`server/src/service/ai_service.py`、`server/src/controller/chat_controller.py`。
- 验收标准（DoD）：
  - 至少 2 条自动化路径：支持多模态、明确不支持多模态。
  - 能力变更后无需修改多处硬编码分支。
- 依赖：无。

## 3. 数据、隐私与多 Profile（Data, Privacy, Multi-profile）

### REQ-DAT-001 storyLibraryPath 按 profile 真隔离

- 背景/问题：当前 profile 管理 UI 已有基础，但数据根路径隔离仍不完整。
- 范围：实现每个 profile 的独立数据目录策略（会话数据/附件）并与生命周期一致。
- 用户可见行为：切换 profile 后数据与配置互不串档。
- 技术要点（高层）：`src/components/settings/SettingsPanel.tsx`、`src/hooks/useAppSettings.ts`、后端数据路径解析与 Tauri 挂载链路。
- 验收标准（DoD）：
  - 双 profile 下会话列表、附件、配置互相隔离。
  - 至少 1 条集成测试或 e2e 覆盖 profile 切换隔离场景。
- 依赖：无（先于加密备份落地路径模型；`REQ-DAT-002` 依赖本项）。

### REQ-DAT-002 备份/恢复向导与加密包

- 背景/问题：备份恢复能力需从基础功能升级到可控、可恢复、可诊断的向导流程。
- 范围：导出范围选择、密码设置、包版本校验、错误码、与 diagnostics 联动。
- 用户可见行为：用户可通过向导完成加密备份导出与导入恢复，错误可理解可处理。
- 技术要点（高层）：`src/components/settings/DataSettings.tsx`、`src-tauri/src/diagnostics.rs`、服务端/客户端版本校验逻辑。
- 验收标准（DoD）：
  - 正常导出/导入成功；错误密码、损坏包、版本不兼容可返回稳定错误码。
  - 至少 1 条组件测试 + 1 条 e2e 覆盖关键路径。
- 依赖：`REQ-DAT-001`、`REQ-OBS-001`。

## 4. 国际化与无障碍（i18n & a11y）

### REQ-A11Y-001 a11y 深化与覆盖扩展

- 背景/问题：关键流程存在键盘与焦点管理补齐空间，自动化覆盖不足。
- 范围：补齐 tab 顺序、焦点陷阱、关键页面可达性；扩展 axe + Playwright 场景。
- 用户可见行为：键盘可无障碍完成核心流程，焦点行为稳定。
- 技术要点（高层）：`e2e/axe-helpers.ts`、chat/story/settings 相关组件。
- 验收标准（DoD）：
  - 关键流程无阻断级 a11y 问题。
  - 至少 1 条自动化 a11y 检查覆盖 chat controls 与 data settings。
- 依赖：`REQ-DAT-002`、`REQ-NAR-002`（主要 UI 变更后再集中修 a11y 与扫描范围，可酌情并行）。

## 5. 可观测性与运维（Observability & Operations）

### REQ-OBS-001 结构化日志与诊断脱敏扩展

- 背景/问题：跨层日志字段与诊断脱敏策略尚未统一到 profile/附件路径。
- 范围：统一日志字段（`requestId`、`conversationId`、`profileId` 等）并扩展诊断脱敏。
- 用户可见行为：用户导出诊断包时敏感信息得到默认保护。
- 技术要点（高层）：Python 日志工具、前端 telemetry/error 路径、`src-tauri/src/diagnostics.rs`。
- 验收标准（DoD）：
  - 三层日志字段可关联一次请求链路。
  - 诊断包默认脱敏附件路径与 profile 标识。
- 依赖：无（先于 `REQ-DAT-002` 加密包与 bundle 导出中的敏感字段处理）。

## 6. 测试与质量（Testing & Quality）

### REQ-QA-001 虚拟化列表动态高度与性能预算对齐

- 背景/问题：当前窗口化渲染已落地基础方案，仍需动态高度与性能预算验证。
- 范围：补齐动态高度策略、滚动定位稳定性、与性能基线验收。
- 用户可见行为：长会话滚动流畅、定位稳定、无明显闪烁或跳动。
- 技术要点（高层）：`src/components/chat/MessageList.tsx`、前端性能观测与基准脚本。
- 验收标准（DoD）：
  - 在长会话场景下满足既定性能预算。
  - 至少 1 条测试覆盖动态高度或滚动恢复关键逻辑。
- 依赖：无（与 `REQ-AI-002` 可并行；附件消息会放大列表压力，建议在 multimodal 联调前完成基线性能）。

### REQ-QA-002 关键路径 E2E 与迁移演练自动化

- 背景/问题：当前测试覆盖以单测/局部集成为主，缺完整业务链路与迁移演练自动化。
- 范围：补齐分支闭环、multimodal、多 profile、PDF、加密备份的 e2e；增加迁移 dry-run/down 演练。
- 用户可见行为：发布前可通过自动化报告验证关键路径健康度。
- 技术要点（高层）：`e2e`、`server/tests`、`server/src/infrastructure/schema_migrations.py`。
- 验收标准（DoD）：
  - 新增关键 e2e 全绿并接入质量门。
  - 迁移演练（至少 dry-run + 回滚策略验证）可重复执行。
- 依赖：`REQ-NAR-003`、`REQ-NAR-004`、`REQ-AI-002`、`REQ-DAT-002`、`REQ-A11Y-001`、`REQ-OBS-001`、`REQ-AI-001`（发布前质量门禁；用例随各 REQ 合入逐步扩充，避免与实现阶段形成环依赖）。
