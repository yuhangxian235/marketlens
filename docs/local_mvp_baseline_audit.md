# MarketLens Local MVP Baseline Audit

审计日期：2026-07-25  
范围：Phase 1.5 — Local MVP Baseline Audit and Freeze  
约束：未连接 Monad；未启用真实 Moss simulate；未添加签名、广播或新产品功能；未创建 Git commit。

## A. 当前模块状态矩阵

| 模块 | 状态 | 审计结论 |
| --- | --- | --- |
| `contracts/src/PredictionMarket.sol` | REAL | 可编译的二元 pari-mutuel 本地合约 |
| `contracts/test/` | REAL | unit/fuzz/invariant 共 44 项，全部通过 |
| `contracts/script/` | REAL | Foundry Deploy/Seed 脚本存在；当前 Python demo 未调用它们 |
| `analytics/src/marketlens/` | REAL | RPC、解码、checkpoint、SQLite、流水线、验证、evidence export |
| `analytics/sql/` | REAL | schema、规范化、市场、wallet、repeat、cross-market 查询 |
| `analytics/tests/` | REAL | 16 项 fixture/FakeRpc 回归测试；不是当前 26 条日志的集成测试 |
| `analytics/data/*.db` | STATIC / GENERATED | 忽略的历史数据库，不属于源码基线 |
| `web/src/` | REAL | Next.js 静态展示和 Action workbench |
| `web/public/data/*.json` | STATIC | 历史 local-fork 分析快照；构建时读取 |
| `prediction-market-actions` calldata | REAL | viem ABI encode；可解码验证参数和值 |
| `prediction-market-actions` simulation | MOCK | Receipt、events、balance changes 由 `createMockEnvelope` 确定性生成 |
| 应用层 Moss adapter | SCAFFOLD | 所有入口 fail-closed |
| `moss-prediction-market` | SCAFFOLD / PARTIAL REAL | 在外部固定上游工作区可验证的 Protocol 解析扩展；未接入应用 simulate |
| `demo.ps1` 编排 | REAL | 会部署、造数、索引、校验和导出；运行需要 Monad fork RPC |
| `demo/local-run.json` | STATIC | 上一次 local-fork 运行清单 |
| `config/deployments/*.json` | STATIC | 本地 fork 部署记录，不是 Monad 部署 |
| `artifacts/abi/PredictionMarket.ts` | STATIC / GENERATED | 由合约 artifact 生成的 ABI |
| Monad 网络部署 | NOT IMPLEMENTED | 没有生产/测试网部署证据 |
| 真实 Moss simulate | NOT IMPLEMENTED | 没有真实 trace 或真实 Receipt |
| 钱包签名 | NOT IMPLEMENTED | 无 signer/private-key path |
| Action 广播 | NOT IMPLEMENTED | 无 `eth_sendTransaction` / `eth_sendRawTransaction` |
| 模拟/真实结果核对 | NOT IMPLEMENTED | 没有已广播交易可供 reconciliation |

## B. REAL / MOCK / STATIC / SCAFFOLD 清单

**REAL**

- Solidity 合约、事件与本地结算逻辑。
- RPC event indexer、ABI decoder、reorg checkpoint、SQLite schema/transform。
- 版本化 SQL、wallet/market/repeat/cross-market 指标和 evidence exporter。
- Next.js 页面、路由生成和 JSON 读取。
- `buyPosition` unsigned calldata/value 构造与确定性约束检查。

**MOCK**

- Action adapter 的 simulation envelope。
- Mock Receipt、ordered transfers、events、position units 和 warnings。
- Web Action workbench 的执行预览。

**STATIC**

- `web/public/data/{markets,analytics,evidence,manifest}.json`。
- `demo/local-run.json`、local-fork network/deployment manifests。
- 种子交易计划、开发地址和生成 ABI。

**SCAFFOLD**

- 应用层 `MossPredictionMarketActionAdapter`：明确抛出 unavailable error。
- source-pinned Moss package：仅在外部 Moss monorepo workspace 中构建/测试。

**NOT IMPLEMENTED**

- Monad 部署、真实 Moss simulate、钱包签名、Action 广播、simulation/onchain reconciliation。

## C. 合约测试覆盖矩阵

本轮未修改业务合约，只补充独立测试和 invariant handler。`forge test -vvv` 最终结果：**44 passed / 0 failed / 0 skipped**。

| # | 业务风险 | 测试证据 |
| --- | --- | --- |
| 1 | owner 创建市场 | `testOwnerCanCreateMarket` |
| 2 | 非 owner 创建失败 | `testNonOwnerCannotCreateMarket` |
| 3 | 空 question 失败 | `testEmptyQuestionCannotCreateMarket` |
| 4 | 无效 closeTime 失败 | `testCloseTimeAtCurrentTimestampCannotCreateMarket` |
| 5 | 买 YES | `testWalletCanBuyYes` |
| 6 | 买 NO | `testWalletCanBuyNo` |
| 7 | 多次购买累计 | `testRepeatedBuysAccumulateWalletStakeAndPool` |
| 8 | 零金额失败 | `testZeroValueBuyFails` |
| 9 | 无效 outcome 失败 | `testUnsetOutcomeBuyFails` |
| 10 | 关闭后购买失败 | `testBuyAtCloseTimeFails` |
| 11 | resolve 后购买失败 | `testBuyAfterResolutionFails` |
| 12 | 非 owner resolve 失败 | `testNonOwnerCannotResolveMarket` |
| 13 | 提前 resolve 失败 | `testMarketCannotResolveBeforeClose` |
| 14 | resolve YES | `testOwnerCanResolveYes` |
| 15 | resolve NO | `testOwnerCanResolveNo` |
| 16 | 重复 resolve 失败 | `testResolvedMarketCannotResolveAgain` |
| 17 | 获胜方领取 | `testWinningWalletCanClaimExactPayout` |
| 18 | 失败方领取失败 | `testLosingWalletCannotClaim` |
| 19 | 重复领取失败 | `testWinningWalletCannotClaimTwice` |
| 20 | payout 正确 | `testWinningWalletCanClaimExactPayout` |
| 21 | 多获胜钱包按比例领取 | `testClaimsConservePoolAndGiveRoundingDustToLastWinner` |
| 22 | 总 payout 不超过 totalPool | `invariantSuccessfulPayoutsNeverExceedResolvedPool` |
| 23 | 空获胜池不能 resolve | **规格冲突**：当前设计允许 resolve 并进入 refund mode；由 `testEmptyWinningPoolResolvesIntoRefundMode` 和 `testZeroWinnerMarketRefundsEveryContribution` 固化 |
| 24 | 不存在 market 失败 | `testBuyForMissingMarketFails`、`testResolveForMissingMarketFails`、`testClaimForMissingMarketFails` |
| 25 | 直接原生币转账行为明确 | `testDirectNativeTransferIsRejected` |
| 26 | event 参数正确 | 四个 `*EventContainsIndexerFields` 测试 |
| 27 | claimed 在转账前修改 | `testClaimedStateIsVisibleBeforePayoutTransfer` |
| 28 | rounding 边界 | `testClaimsConservePoolAndGiveRoundingDustToLastWinner` |

原有 12 个测试函数：

1. `testOwnerCanCreateMarket`
2. `testWalletCanBuyYesAndNoPositions`
3. `testOwnerCanResolveClosedMarket`
4. `testClaimsConservePoolAndGiveRoundingDustToLastWinner`
5. `testZeroWinnerMarketRefundsEveryContribution`
6. `testCreateMarketRejectsInvalidInputsAndUnauthorizedWallet`
7. `testBuyPositionRejectsInvalidLifecycleAndValue`
8. `testResolveMarketRejectsUnauthorizedEarlyAndDuplicateResolution`
9. `testLosingAndDuplicateClaimsRevert`
10. `testPayoutFailureRollsBackClaimState`
11. `testDirectNativeTransferIsRejected`
12. `testFuzzBuyPositionTracksPoolAndUnits`

原报告的“13 项”是以上 12 个函数加原有
`invariantPoolsEqualAcceptedBuys`。本轮另有 27 个独立 coverage tests，并将
invariant tests 扩为 5 个；fuzz 用例运行 256 次。

## D. Invariant 说明

配置来自 `contracts/foundry.toml`：

```text
runs = 256
depth = 64
fail_on_revert = false
```

每个 invariant 的随机状态机调用数为 `256 × 64 = 16,384`。当前共 5 个 invariant，因此报告中可观察到五个独立的 16,384-call campaign（合计 81,920 handler calls），全部 0 revert。

| Harness | actor | targetSelector | 可能动作 |
| --- | --- | --- | --- |
| `PredictionMarketHandler` | 四个固定购买地址 | `buy(uint8,uint96,bool)` | 选择 actor、给资金并购买 YES/NO |
| `PredictionMarketClaimHandler` | 三个固定获胜地址 | `claim(uint8)` | 选择 actor，未领过则领取 |

两个 harness 都显式 `excludeContract(address(market))`，随机调用仅落到 handler。

已证明的局部性质：

- `yesPool/noPool` 等于 handler 已接受购买的 ghost sums；四个 actor 的逐方向
  `positions` 分别等于对应 ghost stakes。
- 合约余额等于两个 pool 之和。
- `successfulPayouts <= resolvedTotalPool`。
- 每个固定 actor 最多成功 claim 一次。
- `claimed` 状态、ghost claim 次数和 actor 余额变化一致。
- 成功 payout 加剩余 payout 等于 resolve 时 total pool，合约余额与剩余 payout 一致。

未证明：

- 这不是自动安全审计或形式化证明。
- 未覆盖 owner 恶意行为、多市场交互、预言机、主网环境、gas/liveness、时间戳操纵或所有外部合约回调。
- `fail_on_revert=false` 不会把随机 revert 自动视为失败；本次 handler 统计为 0 revert，但配置本身仍需被理解。

## E. Analytics 数据来源

当前报告原先的 8 项 Analytics 测试均使用临时 SQLite、fixture 或 FakeRpc，不读取现存 26-log 数据库：

| 原测试 | 验证内容 |
| --- | --- |
| `test_decoder_rejects_unknown_event_topic` | 未知 topic fail-closed |
| `test_sync_is_idempotent_at_the_public_event_ledger_seam` | 重复 RPC 索引不会重复 ledger event |
| `test_checkpoint_hash_change_marks_old_events_removed` | checkpoint hash 变化标记旧日志 removed |
| `test_pipeline_computes_repeat_and_market_metrics_independently` | SQL/pandas 独立计算市场和重复参与指标 |
| `test_evidence_sample_transactions_stay_inside_analysis_run` | evidence 样本交易不越过 analysis run |
| `test_d1_is_ineligible_when_first_seen_day_is_partial` | partial first-seen day 不进入 D1 分母 |
| `test_router_rejects_model_authored_query_shapes` | 只允许注册查询形状 |
| `test_router_interrupts_registered_query_after_deadline` | 查询 deadline 中断 |

本轮另补 8 项回归测试，总数 **16**：

- 正向 ABI 字段解码；
- decode failure 不进入规范化表；
- 缺失 block timestamp fail-closed；
- 超过 SQLite signed-integer 范围的 aligned wei 精确规范化；
- first-touch 按 `(block_number, transaction_index, log_index)`；
- evidence 缺少必要 check 时 fail-closed；
- block range 不覆盖完整 UTC 日时 D1 不合格；
- SQLite foreign key enforcement。

### 指标口径核对

当前静态 analysis run 的统一范围是半开 UTC 区间
`[2026-07-26T00:00:00Z, 2026-07-30T00:00:00Z)`，inclusive block range
为 `90057010..90057042`。

| 指标 | 分子 | 分母 | 当前样本 | 口径结论 |
| --- | --- | --- | --- | --- |
| unique wallets | 有合格 `PositionBought` 的 distinct addresses | 不适用 | 6 | 地址，不是自然人用户 |
| first seen | 每个 wallet 按 block/tx/log 顺序的首次样本内购买 | 不适用 | 6 wallets | `first_seen_in_sample`，不是平台新用户 |
| cohort | first-seen UTC date 上的 wallets | 全部样本 wallets（用于 share 时） | 受控 fixture | 按 UTC 日期 |
| repeat participation | 首次日期之后仍有购买的 wallets | 全部样本 wallets | 5 / 6 | 样本内重复参与，不是平台留存 |
| markets joined | 每 wallet 的 distinct market count | 全部样本 wallets（用于 multi-market share） | 5 / 6 加入至少两个 | 地址级、样本内 |
| D1 | first-seen 后一个 UTC 日有购买的 eligible wallets | cohort day 与次日都完整的 wallets | 4 / 6，66.7% | Demo sample 指标，不是可靠平台 retention |

pipeline 会把 observation window 截断的首尾 UTC 日标记为 partial，并从 D1
eligible denominator 排除；本轮还补了 block checkpoint 覆盖不足时同样排除的测试。
当前 UI 使用 “wallet”“first-seen-in-sample”“returned later in sample”“D1 repeat”
及 demo/fixture 限定，不把地址称为用户，也不把该百分比称为真实留存。

## F. 26 条日志来源

26 条日志不是 Monad 网络生产数据，也不是手写 JSON。它们来自一次历史 `scripts/demo.ps1` 运行：固定 Monad header 创建本地 Anvil fork，Python Web3 向 Anvil unlocked development accounts 提交部署、SeedDemo 购买、resolve 和 claim 交易，然后 indexer 从本地 RPC 读取真实合约日志。

- 3 `MarketCreated`
- 12 `PositionBought`
- 3 `MarketResolved`
- 8 `RewardClaimed`
- 合计 26 events；另有 1 笔部署交易无业务 event，所以清单有 27 个 transaction hashes。

历史数据库只读审计：

- chain ID：`143`
- raw rows：`26`
- distinct `(chain_id, transaction_hash, log_index)`：`26`
- decode errors：`0`
- 必需 envelope 字段缺失：`0`
- normalized `position_buys`：`12`
- foreign-key violations：`0`

事件唯一键确认为：

```text
chain_id + transaction_hash + log_index
```

每条 raw event 保存 `block_number`、`block_timestamp`、`transaction_index`、`event_name` 及原始 topics/data；解码后的表保存 `market_id`、wallet、amount 等事件字段。缺 timestamp 会拒绝 ingest；UTC 日期由 timestamp 生成；first-touch 使用 block/transaction/log 顺序。

## G. 6 项数据检查定义

历史 manifest 的 6 项为：

| Check | 实际定义 |
| --- | --- |
| `distinct_wallet_count` | SQLite wallet summary 行数与 pandas 对 `PositionBought.wallet` 的 distinct count 相等 |
| `cohort_sum_equals_distinct_wallets` | 当前实现比较 wallet summary 行数和 pandas distinct wallets；名称比实现更强，尚未独立求和每日 cohort |
| `per_market_volume_gwei` | SQL 各 market 的 aligned-gwei amount sum 与 pandas group sum 完全相等 |
| `yes_plus_no_equals_total` | SQL summary 中 YES gwei + NO gwei 等于 total gwei |
| `claimed_payout_wei` | SQLite `uint256_sum(payout_wei)` 文本结果与 Python `int` sum 完全相等 |
| `decode_errors` | 最近 ingest run 的 decode error count 为 0 |

本轮已将 publishability 改为要求上述 6 个名称全部存在且全部 PASS。Phase 0 文档列出的 10 项是目标口径；当前只实现 6 项，不能把剩余 4 项描述为已完成。

## H. Action Mock 边界

原有 4 项 Action 测试：

1. `prepares buy calldata and value without a signer`
2. `checks values and keeps MOCK visibly non-verifiable`
3. `fails closed when source-pinned Moss prerequisites are incomplete`
4. `rejects payments that are not aligned to one gwei`

本轮新增两个篡改回归测试，总数 **6**：交易真实 `value` 不能被伪造的 expected payment 绕过；sender/event wallet/market identity 不一致会失败。

- **真实**：viem ABI calldata、unsigned tx fields、应用层 constraint checker。
- **Mock**：Receipt、ordered changes、events、余额变化、position units、warnings。
- Receipt 来源：`createMockEnvelope`，不是 Moss，不是 RPC。
- 不读取真实事件或真实余额变化。
- 应用层 Moss adapter 所有入口 fail-closed。
- 页面和移动端 header 均显示 `ACTION MOCK`。
- 代码中不存在 Action/UI 私钥加载、自动签名、`eth_sendTransaction`、`eth_sendRawTransaction` 或自动广播。
- 禁止性文案 `Simulated by Moss`、`Moss verified`、`Ready to sign`、`Onchain verified` 不存在。

## I. Moss 真实集成缺口

- 固定上游提交为 `d09b38cbc44ee7f5722c5d09e7224f7750187762`。
- `packages/moss-prediction-market` 依赖 `@themoss/core: workspace:*`，但被排除在本仓库 pnpm workspace 之外。
- 该 package 只有 Capability/Receipt 解析和预测市场 vocabulary patch；没有真实 simulate 调用。
- 应用 `MossPredictionMarketActionAdapter` fail-closed。
- simulator 结果没有可核验的固定 block hash/timestamp；没有 zero-warning 真实 trace。
- 需要外部已 clone 的 Moss monorepo 才能测试，因此不能称为本仓库 clean reproduction。

## J. 21 个 Next.js 生成页面

构建会生成 21 个页面实例：4 个公开基础页面、15 个静态 evidence 参数页，以及 2 个 Next 内部页面。15 个 evidence 页面由 `generateStaticParams` 动态生成，但产物为静态页面。

| # | 路由 | 用途 | 是否公开 |
| --- | --- | --- | --- |
| 1 | `/` | 重定向到 markets | 是 |
| 2 | `/markets` | 市场活动快照 | 是 |
| 3 | `/product-analytics` | 样本内 wallet/repeat/cross-market 分析 | 是 |
| 4 | `/action` | ACTION MOCK workbench | 是 |
| 5 | `/evidence/global.d1_repeat_rate` | D1 evidence | 是 |
| 6 | `/evidence/global.multi_market_share` | multi-market evidence | 是 |
| 7 | `/evidence/global.unique_wallets` | unique-wallet evidence | 是 |
| 8 | `/evidence/market.1.first_touch_wallets` | market 1 first-touch evidence | 是 |
| 9 | `/evidence/market.1.total_amount_mon` | market 1 volume evidence | 是 |
| 10 | `/evidence/market.1.trade_count` | market 1 trades evidence | 是 |
| 11 | `/evidence/market.1.unique_wallets` | market 1 wallets evidence | 是 |
| 12 | `/evidence/market.2.first_touch_wallets` | market 2 first-touch evidence | 是 |
| 13 | `/evidence/market.2.total_amount_mon` | market 2 volume evidence | 是 |
| 14 | `/evidence/market.2.trade_count` | market 2 trades evidence | 是 |
| 15 | `/evidence/market.2.unique_wallets` | market 2 wallets evidence | 是 |
| 16 | `/evidence/market.3.first_touch_wallets` | market 3 first-touch evidence | 是 |
| 17 | `/evidence/market.3.total_amount_mon` | market 3 volume evidence | 是 |
| 18 | `/evidence/market.3.trade_count` | market 3 trades evidence | 是 |
| 19 | `/evidence/market.3.unique_wallets` | market 3 wallets evidence | 是 |
| 20 | `/_not-found` | Next 404 内部产物 | 否；框架必需 |
| 21 | `/_global-error` | Next 全局错误内部产物 | 否；框架必需 |

没有测试/调试路由，也没有明显重复的公开页面。页面不访问 SQLite API；来源是 build-time local JSON、静态 demo facts 和 mock action。

## K. 完整复现命令与结果

离线可执行部分：

```powershell
corepack pnpm install --offline --frozen-lockfile
uv sync --offline --project analytics --extra dev --python 3.11
wsl.exe -e bash -lc "cd /mnt/c/Users/Administrator/Documents/Codex/2026-07-25/files-mentioned-by-the-user-web3/outputs/marketlens/contracts && /home/xyh/.foundry/bin/forge build"
wsl.exe -e bash -lc "cd /mnt/c/Users/Administrator/Documents/Codex/2026-07-25/files-mentioned-by-the-user-web3/outputs/marketlens/contracts && /home/xyh/.foundry/bin/forge test -vvv"
uv run --project analytics pytest -q
uv run --project analytics ruff check analytics/src analytics/tests
corepack pnpm --filter @marketlens/prediction-market-actions test
corepack pnpm --filter @marketlens/prediction-market-actions typecheck
corepack pnpm --filter @marketlens/web lint
corepack pnpm --filter @marketlens/web typecheck
corepack pnpm --filter @marketlens/web build
```

网络化完整 demo 命令（本轮禁止执行）：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/demo.ps1
```

本轮实际离线结果：

- pnpm frozen-lockfile install：通过；使用本机离线 cache。
- uv sync：通过；使用本机离线 cache/现有 virtualenv。
- Foundry build：通过；有 3 个预期的 `block.timestamp` lint warnings。
- Foundry test：44 passed / 0 failed / 0 skipped。
- Analytics：16 passed；ruff 通过；有 1 个第三方 websockets deprecation warning。
- Action：6 passed；typecheck、lint 通过。
- 固定 Moss 外部工作区：3 passed；typecheck、build 通过。
- Next.js：lint、typecheck、production build 通过；生成 21 个页面实例。
- 构建后已删除含临时 preview keys 的 `web/.next`；该目录可重新生成。

该脚本负责 demo 日志生成、日志索引、SQLite 建库、数据检查和 JSON 导出，但会先连接 `https://rpc.monad.xyz` 校验 fork header。因此完整 clean reproduction 的结论是 **BLOCKED**：

1. 仓库无 commit，无法从 clean checkout 开始；
2. 禁止连接 Monad 时，当前脚本无法重新创建 local fork 和 26 条日志。

此外，本机验证依赖已有 pnpm/uv/Foundry/solc/forge-std 缓存；Moss package 依赖仓库外固定上游工作区。单元测试不依赖残留数据库，Web build 依赖未提交的静态 JSON。

## L. 秘密信息检查

源码范围文本扫描未发现生产 private key、mnemonic、API key、带私密 token 的 RPC URL、`.env`、钱包密钥或真实身份信息。`.env` 不存在，且 `.env`/`.env.*` 已忽略，`.env.example` 保留。

审计期间发现并清理两类忽略的生成秘密：

- `work/anvil.stdout.log`：Anvil development credentials；
- `web/.next/prerender-manifest.json`：Next preview signing/encryption keys。

两者均为可再生生成物，已删除且未提交；报告不记录秘密值。`.gitignore` 还覆盖 logs、node_modules、virtualenv、Next、Foundry、SQLite/report 和 work 产物。

## M. 已知风险

1. 没有 commit，当前所有源码均为 untracked，尚无可恢复基线。
2. 完整零状态 demo 在禁 Monad 条件下不可复现。
3. 静态 manifest 的 pipeline version 是 `v1`，代码已变为 `v1.1-baseline`；尚未重导出。
4. 只实现 6 项 publishability checks，不是 Phase 0 目标的 10 项。
5. `cohort_sum_equals_distinct_wallets` 名称强于其当前计算。
6. 26 条日志来自受控 seed/local fork，不代表真实采用、用户或留存。
7. 空获胜池需求与当前 refund-mode 合约语义冲突。
8. owner 手动 resolve 是中心化信任边界。
9. Moss package 的构建依赖外部 workspace；应用仍为 Mock。
10. reproduction manifests 未记录所有源码 commit/构建依赖 hash。
11. Foundry 对三个基于 `block.timestamp` 的生命周期判断给出 validator-manipulation
    warning；对日级 demo 无实质影响，但不是可忽略的生产部署审计结论。

## N. 下一阶段建议

下一阶段只处理一个核心目标：**把冻结后的本地 MVP 做成不依赖 Monad、外部 Moss 工作区或残留数据库的自包含 clean reproduction**。在该目标完成前，不进入真实协议集成、签名或广播。

## O. 推荐 Git commit 内容

当前秘密风险已清理、审计与离线测试已完成，但完整 clean reproduction 仍为 BLOCKED。若用户接受这一已记录限制，当前状态适合创建“审计后的第一个基线 commit”；本轮不自行提交。

建议纳入：全部源码、锁文件、文档、ABI 和静态 demo JSON；继续排除 caches、DB、logs、`.next`、Foundry artifacts、virtualenv 和 `work/`。

建议命令：

```powershell
git add .
git status --short
git diff --cached --check
git commit -m "chore: freeze audited local MVP baseline"
```

推荐 commit message：

```text
chore: freeze audited local MVP baseline
```
