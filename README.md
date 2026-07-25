# MarketLens

MarketLens 是一个本地预测市场分析 MVP：它包含可运行的 Solidity 合约、RPC 日志索引、SQLite/SQL/pandas 分析、证据页面，以及一个明确标记为 Mock 的 Action 预览。当前仓库不声称已部署到 Monad，也不声称接入了真实 Moss simulate、钱包签名或交易广播。

## Current Status

| 能力 | 状态 | 准确说明 |
| --- | --- | --- |
| Local contract | **REAL** | Solidity `0.8.26` 合约可由 Foundry 构建和测试；仅证明本地实现 |
| Local event indexing | **REAL** | RPC 拉取、ABI 解码、复合键去重、reorg checkpoint 和 SQLite 写入均已实现 |
| Analytics | **REAL pipeline / STATIC HISTORICAL DEMO SAMPLE** | SQL/pandas 流水线是真实实现；当前网页数字来自历史 local-fork 样本的静态 JSON 快照，尚未完成本地 clean reproduction |
| Action execution | **MOCK** | calldata 构造真实；Receipt、事件和余额变化为确定性 Mock |
| Moss simulation | **NOT ENABLED** | package scaffold exists; fail-closed; external Moss monorepo required; real simulate not enabled |
| Monad deployment | **NOT DEPLOYED** | 仓库中只有历史 local-fork 部署清单，不是 Monad 网络部署 |
| Wallet signing | **NOT IMPLEMENTED** | 不加载私钥，不创建签名 |
| Broadcasting | **NOT IMPLEMENTED** | Action/UI 无发送路径；demo 驱动仅会向一次性本地 Anvil 广播种子交易 |

详细证据、测试映射、路由清单、复现结果和已知风险见 [Hermes Handoff Audit](docs/hermes_handoff_audit.md) 和 [Local MVP Baseline Audit](docs/local_mvp_baseline_audit.md)。

## 模块边界

- `contracts/`：**REAL** 本地合约、部署/种子脚本和 44 项 Foundry 测试。
- `analytics/`：**REAL** 索引与分析实现；单元测试使用 fixture/FakeRpc，网页所用结果是 **STATIC** demo 快照。
- `packages/prediction-market-actions/`：真实 ABI calldata 构造 + **MOCK** simulation envelope；真实 Moss adapter 为 **SCAFFOLD** 且 fail-closed。
- `packages/moss-prediction-market/`：固定 Moss 源码提交上的离线 Protocol 解析扩展；不等于应用已调用真实 Moss simulate。
- `web/`：**REAL** Next.js 展示层；数据源是 build-time 本地 JSON，Action 是 **MOCK**。
- `demo/`：真实复现编排代码与 **STATIC** 历史 local-fork 清单；运行会需要 Monad RPC，仅用于创建本地 fork。
- `config/`、`artifacts/abi/`、`web/public/data/`：版本化配置、生成 ABI 和 **STATIC** 演示快照。

## 架构摘要

```text
Monad RPC（只用于创建本地 fork）
  → local Anvil 上的 PredictionMarket 日志
  → 幂等 raw event store
  → ABI 解码与规范化表
  → 版本化 SQL + pandas 检查
  → SQLite summaries + evidence JSON
  → Next.js Markets / Analytics / Evidence

User intent
  → 真实 ABI calldata 构造
  → 确定性 MOCK Receipt / events / balance changes
  → 应用层约束检查
  → 只展示；不签名、不广播
```

## 当前演示数据

网页读取 `web/public/data/*.json`，不直接查询 SQLite API。该快照记录：

- chain ID `143`；
- local-fork blocks `90057010..90057042`；
- 3 个种子市场、6 个开发地址；
- 26 条本地合约事件：3 `MarketCreated`、12 `PositionBought`、3 `MarketResolved`、8 `RewardClaimed`；
- 6 项基线数据检查全部通过。

这些数字来自人为设计的 local-fork fixture，只能证明工程链路，不代表真实用户、需求或留存。`wallet` 仅指地址；`first_seen_in_sample` 不是平台新用户；D1 是样本内重复参与率，不是平台留存。

## 本地验证

以下命令不连接 Monad，可验证已有代码：

```powershell
corepack pnpm install --offline --frozen-lockfile
uv sync --offline --project analytics --extra dev --python 3.11
wsl.exe -e bash -lc "cd /mnt/c/<project>/contracts && /home/<user>/.foundry/bin/forge build && /home/<user>/.foundry/bin/forge test -vvv"
uv run --project analytics pytest -q
uv run --project analytics ruff check analytics/src analytics/tests
corepack pnpm --filter @marketlens/prediction-market-actions test
corepack pnpm --filter @marketlens/web build
```

Moss 固定源码包依赖上游 Moss monorepo 的 `@themoss/core` workspace，目前不能从本仓库单独、干净安装。其缓存上游工作区验证不构成干净复现证据。

## 网络化 demo

```powershell
powershell -ExecutionPolicy Bypass -File scripts/bootstrap.ps1 -SkipMoss
powershell -ExecutionPolicy Bypass -File scripts/demo.ps1
corepack pnpm --filter @marketlens/web dev
```

`scripts/demo.ps1` 会连接 `https://rpc.monad.xyz` 校验固定 fork header，然后启动本地 Anvil、部署、造数、索引、建库、校验并导出 JSON。Phase 1.5 明确禁止连接 Monad，因此本轮没有运行该命令，也没有证明从零重新生成 26 条日志和 6/6 检查。

## 关键限制

- 当前 Git `main` 分支没有 commit，所有源码均未跟踪，因此尚不存在可 checkout 的干净基线。
- 当前静态 JSON 是历史运行产物，pipeline version 为 `marketlens-pipeline-v1`；代码已进入 `v1.1-baseline`，未在禁网条件下重导出。
- 规格清单中的“空获胜池不能 resolve”与现有退款模式冲突；合约当前允许 resolve，并按贡献退款。
- 合约由 owner 手动解决市场，存在集中化信任边界。
- 真实 Moss simulate、模拟与真实交易核对、签名、广播均未实现。

## 目录

```text
marketlens/
├── contracts/                       # Foundry contract/scripts/tests
├── analytics/                       # RPC indexer, SQLite, SQL/pandas, evidence
├── packages/
│   ├── prediction-market-actions/   # app seam, mock adapter, constraints
│   └── moss-prediction-market/      # source-pinned offline Protocol extension
├── web/                             # Next.js static evidence UI
├── demo/                            # static local-run manifest
├── config/                          # static network/deployment manifests
├── artifacts/abi/                   # generated contract ABI
├── scripts/                         # bootstrap/demo/ABI entrypoints
└── docs/
```

## 文档

- [Hermes Handoff Audit](docs/hermes_handoff_audit.md) ← **本次接管审计**
- [Local MVP Baseline Audit](docs/local_mvp_baseline_audit.md)
- [Phase 0 报告](docs/phase0_report.md)
- [Phase 1 历史报告](docs/phase1_report.md)
- [架构](docs/architecture.md)
- [合约规格](docs/contract_spec.md)
- [数据字典](docs/data_dictionary.md)
- [指标定义](docs/metric_definitions.md)
- [Moss 调研](docs/moss_research.md)

