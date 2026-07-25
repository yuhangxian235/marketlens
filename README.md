     1|# MarketLens
     2|
     3|MarketLens 是一个本地预测市场分析 MVP：它包含可运行的 Solidity 合约、RPC 日志索引、SQLite/SQL/pandas 分析、证据页面，以及一个明确标记为 Mock 的 Action 预览。当前仓库不声称已部署到 Monad，也不声称接入了真实 Moss simulate、钱包签名或交易广播。
     4|
     5|
     6|## Current Status
     7|
     8|| 能力 | 状态 | 准确说明 |
     9|| --- | --- | --- |
    10|| Local contract | **REAL** | Solidity `0.8.26` 合约可由 Foundry 构建和测试；仅证明本地实现 |
    11|| Local event indexing | **REAL** | RPC 拉取、ABI 解码、复合键去重、reorg checkpoint 和 SQLite 写入均已实现 |
    12|| Analytics | **REAL pipeline / STATIC HISTORICAL DEMO SAMPLE** | SQL/pandas 流水线是真实实现；当前网页数字来自历史 local-fork 样本的静态 JSON 快照，尚未完成本地 clean reproduction |
    13|| Action execution | **MOCK** | calldata 构造真实；Receipt、事件和余额变化为确定性 Mock |
    14|| Moss simulation | **NOT ENABLED** | Protocol package ready (3 Caps + 3 Receipts); blocked by network to clone Moss SDK |
    15|| Monad deployment | **NOT DEPLOYED** | 仓库中只有历史 local-fork 部署清单，不是 Monad 网络部署 |
    16|| Wallet signing | **NOT IMPLEMENTED** | 不加载私钥，不创建签名 |
    17|| Broadcasting | **NOT IMPLEMENTED** | Action/UI 无发送路径；demo 驱动仅会向一次性本地 Anvil 广播种子交易 |
    18|
    19|详细证据、测试映射、路由清单、复现结果和已知风险见 [Hermes Handoff Audit](docs/hermes_handoff_audit.md) 和 [Local MVP Baseline Audit](docs/local_mvp_baseline_audit.md)。
    20|
    21|## 模块边界
    22|
    23|- `contracts/`：**REAL** 本地合约、部署/种子脚本和 44 项 Foundry 测试。
    24|- `analytics/`：**REAL** 索引与分析实现；单元测试使用 fixture/FakeRpc，网页所用结果是 **STATIC** demo 快照。
    25|- `packages/prediction-market-actions/`：真实 ABI calldata 构造 + **MOCK** simulation envelope；真实 Moss adapter 为 **SCAFFOLD** 且 fail-closed。
    26|- `packages/moss-prediction-market/`：固定 Moss 源码提交上的离线 Protocol 解析扩展；不等于应用已调用真实 Moss simulate。
    27|- `web/`：**REAL** Next.js 展示层；数据源是 build-time 本地 JSON，Action 是 **MOCK**。
    28|- `demo/`：真实复现编排代码与 **STATIC** 历史 local-fork 清单；运行会需要 Monad RPC，仅用于创建本地 fork。
    29|- `config/`、`artifacts/abi/`、`web/public/data/`：版本化配置、生成 ABI 和 **STATIC** 演示快照。
    30|
    31|## 架构摘要
    32|
    33|```text
    34|Monad RPC（只用于创建本地 fork）
    35|  → local Anvil 上的 PredictionMarket 日志
    36|  → 幂等 raw event store
    37|  → ABI 解码与规范化表
    38|  → 版本化 SQL + pandas 检查
    39|  → SQLite summaries + evidence JSON
    40|  → Next.js Markets / Analytics / Evidence
    41|
    42|User intent
    43|  → 真实 ABI calldata 构造
    44|  → 确定性 MOCK Receipt / events / balance changes
    45|  → 应用层约束检查
    46|  → 只展示；不签名、不广播
    47|```
    48|
    49|## 当前演示数据
    50|
    51|网页读取 `web/public/data/*.json`，不直接查询 SQLite API。该快照记录：
    52|
    53|- chain ID `143`；
    54|- local-fork blocks `90057010..90057042`；
    55|- 3 个种子市场、6 个开发地址；
    56|- 26 条本地合约事件：3 `MarketCreated`、12 `PositionBought`、3 `MarketResolved`、8 `RewardClaimed`；
    57|- 6 项基线数据检查全部通过。
    58|
    59|这些数字来自人为设计的 local-fork fixture，只能证明工程链路，不代表真实用户、需求或留存。`wallet` 仅指地址；`first_seen_in_sample` 不是平台新用户；D1 是样本内重复参与率，不是平台留存。
    60|
    61|## 本地验证
    62|
    63|以下命令不连接 Monad，可验证已有代码：
    64|
    65|```powershell
    66|corepack pnpm install --offline --frozen-lockfile
    67|uv sync --offline --project analytics --extra dev --python 3.11
    68|wsl.exe -e bash -lc "cd /mnt/c/<project>/contracts && /home/<user>/.foundry/bin/forge build && /home/<user>/.foundry/bin/forge test -vvv"
    69|uv run --project analytics pytest -q
    70|uv run --project analytics ruff check analytics/src analytics/tests
    71|corepack pnpm --filter @marketlens/prediction-market-actions test
    72|corepack pnpm --filter @marketlens/web build
    73|```
    74|
    75|Moss 固定源码包依赖上游 Moss monorepo 的 `@themoss/core` workspace，目前不能从本仓库单独、干净安装。其缓存上游工作区验证不构成干净复现证据。
    76|
    77|## 网络化 demo
    78|
    79|```powershell
    80|powershell -ExecutionPolicy Bypass -File scripts/bootstrap.ps1 -SkipMoss
    81|powershell -ExecutionPolicy Bypass -File scripts/demo.ps1
    82|corepack pnpm --filter @marketlens/web dev
    83|```
    84|
    85|`scripts/demo.ps1` 会连接 `https://rpc.monad.xyz` 校验固定 fork header，然后启动本地 Anvil、部署、造数、索引、建库、校验并导出 JSON。Phase 1.5 明确禁止连接 Monad，因此本轮没有运行该命令，也没有证明从零重新生成 26 条日志和 6/6 检查。
    86|
    87|## 关键限制
    88|
    89|- 当前 Git `main` 分支没有 commit，所有源码均未跟踪，因此尚不存在可 checkout 的干净基线。
    90|- 当前静态 JSON 是历史运行产物，pipeline version 为 `marketlens-pipeline-v1`；代码已进入 `v1.1-baseline`，未在禁网条件下重导出。
    91|- 规格清单中的“空获胜池不能 resolve”与现有退款模式冲突；合约当前允许 resolve，并按贡献退款。
    92|- 合约由 owner 手动解决市场，存在集中化信任边界。
    93|- 真实 Moss simulate、模拟与真实交易核对、签名、广播均未实现。
    94|
    95|## 目录
    96|
    97|```text
    98|marketlens/
    99|├── contracts/                       # Foundry contract/scripts/tests
   100|├── analytics/                       # RPC indexer, SQLite, SQL/pandas, evidence
   101|├── packages/
   102|│   ├── prediction-market-actions/   # app seam, mock adapter, constraints
   103|│   └── moss-prediction-market/      # source-pinned offline Protocol extension
   104|├── web/                             # Next.js static evidence UI
   105|├── demo/                            # static local-run manifest
   106|├── config/                          # static network/deployment manifests
   107|├── artifacts/abi/                   # generated contract ABI
   108|├── scripts/                         # bootstrap/demo/ABI entrypoints
   109|└── docs/
   110|```
   111|
   112|## 文档
   113|
   114|- [Hermes Handoff Audit](docs/hermes_handoff_audit.md) ← **本次接管审计**
   115|- [Local MVP Baseline Audit](docs/local_mvp_baseline_audit.md)
   116|- [Phase 0 报告](docs/phase0_report.md)
   117|- [Phase 1 历史报告](docs/phase1_report.md)
   118|- [架构](docs/architecture.md)
   119|- [合约规格](docs/contract_spec.md)
   120|- [数据字典](docs/data_dictionary.md)
   121|- [指标定义](docs/metric_definitions.md)
   122|- [Moss 调研](docs/moss_research.md)
   123|
   124|