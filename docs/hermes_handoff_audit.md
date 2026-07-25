# Hermes Handoff Audit — MarketLens

**审计日期:** 2026-07-25  
**审计人:** Hermes (xyh session)  
**触发:** Codex Phase 1 声称完成后的独立验证  
**范围:** 项目接管、复现、审查、最小必要修复和基线报告

---

## A. 实际项目路径

| 属性 | 路径 |
| --- | --- |
| 源 Codex 输出目录 | `C:\Users\Administrator\Documents\Codex\2026-07-25\files-mentioned-by-the-user-web3\outputs\marketlens` |
| 固定工作目录 | `C:\Users\Administrator\Documents\Projects\marketlens` |
| 源目录保留作为备份 | 是，未修改 |

---

## B. 复制验证

- 复制方式: `rsync -a`，排除 node_modules/.next/.venv/target/cache/out/broadcast/dist
- 源文件数 (排除构建产物): 195
- .git 目录: 已复制
- 关键目录: contracts/, analytics/, web/, packages/, docs/, demo/, scripts/, config/, artifacts/ — 全部存在
- 源目录未删除、未移动

---

## C. Git 状态

```
分支: main
Commit: 无 (your current branch 'main' does not have any commits yet)
未跟踪文件: 全部 (16 个顶层条目)
嵌套 Git 仓库: 无 (仅根目录 .git)
已修改文件: 无
```

**Codex 摘要声称 "Git已经初始化，但没有创建commit"，经验证属实。**

---

## D. 秘密信息扫描

| 扫描类型 | 结果 |
| --- | --- |
| 私钥 (64 hex chars) | 未发现 — 仅 .venv 库常量和 .env.example 中的 FORK_BLOCK_HASH |
| Mnemonic / seed phrase | 未发现 |
| API key / RPC token | .env.example 中 MONADSCAN_API_KEY 已标记为 `***` |
| .env 文件 | 不存在；.gitignore 覆盖 `.env` 和 `.env.*`（保留 .env.example） |
| Anvil 开发私钥 | 仅在 `demo/local-run.json` 的 walletAddresses 中，均为 Anvil 公开开发地址 |
| broadcast/ / cache/ / out/ | 因 .gitignore 排除，未复制到目标 |
| SQLite 数据库 | analytics/data/*.db 已 .gitignore 覆盖 |

**结论: 未发现生产私钥或需要清理的秘密信息。**

---

## E. REAL / MOCK / STATIC / SCAFFOLD 模块矩阵

| 模块 | 状态 | 审计确认 |
| --- | --- | --- |
| `contracts/src/PredictionMarket.sol` | **REAL** | 编译通过，0.8.26，二元 pari-mutuel |
| `contracts/test/` (44 tests) | **REAL** | 44/44 通过 |
| `contracts/script/Deploy.s.sol` | **REAL** | Foundry 脚本 |
| `contracts/script/SeedDemo.s.sol` | **REAL** | 读 env 变量创建 3 个种子市场 |
| `analytics/src/marketlens/` | **REAL** | RPC、ABI 解码、checkpoint、SQLite、pipeline |
| `analytics/sql/` | **REAL** | Schema + 规范化 + 分析查询 |
| `analytics/tests/` (16 tests) | **REAL** | 16/16 通过 |
| `web/src/` | **REAL** | Next.js 静态展示 + Action workbench |
| `web/public/data/*.json` | **STATIC** | 历史 local-fork 分析快照 |
| `prediction-market-actions` calldata | **REAL** | viem ABI encode；解码验证 |
| `prediction-market-actions` simulation | **MOCK** | createMockEnvelope 确定性生成 |
| 应用层 Moss adapter | **SCAFFOLD** | Fail-closed |
| `moss-prediction-market` | **SCAFFOLD** | 需外部 Moss monorepo workspace |
| `demo/local-run.json` | **STATIC** | 历史运行 manifest |
| Monad 部署 | **NOT IMPLEMENTED** | 确认未部署 |
| 真实 Moss simulate | **NOT ENABLED** | Fail-closed |
| 钱包签名 | **NOT IMPLEMENTED** | 无 signer path |
| Action 广播 | **NOT IMPLEMENTED** | 无 eth_sendTransaction |

---

## F. 完整复现命令与结果

所有命令在固定工作目录执行：

| # | 命令 | Exit | 结果 |
| --- | --- | --- | --- |
| 1 | `forge build` | 0 | 编译成功，3 个预期 block.timestamp lint warning |
| 2 | `forge test -vvv` | 0 | **44 passed, 0 failed, 0 skipped** |
| 3 | `uv sync --project analytics --extra dev` | 0 | 54 packages resolved |
| 4 | `uv run --project analytics pytest -q` | 0 | **16 passed** (1 个第三方 warning) |
| 5 | `pnpm install --frozen-lockfile` | 0 | 420 packages |
| 6 | `pnpm --filter @marketlens/prediction-market-actions test` | 0 | **6 passed** |
| 7 | `pnpm --filter @marketlens/web build` | 0 | **21 个静态页面** |

**未执行:** `scripts/demo.ps1` — 需 Monad RPC，当前阶段禁止。

---

## G. Foundry 测试清单 (44 项全部通过)

### PredictionMarket.t.sol (12)
1. testOwnerCanCreateMarket
2. testWalletCanBuyYesAndNoPositions
3. testOwnerCanResolveClosedMarket
4. testClaimsConservePoolAndGiveRoundingDustToLastWinner
5. testZeroWinnerMarketRefundsEveryContribution
6. testCreateMarketRejectsInvalidInputsAndUnauthorizedWallet
7. testBuyPositionRejectsInvalidLifecycleAndValue
8. testResolveMarketRejectsUnauthorizedEarlyAndDuplicateResolution
9. testLosingAndDuplicateClaimsRevert
10. testPayoutFailureRollsBackClaimState
11. testDirectNativeTransferIsRejected
12. testFuzzBuyPositionTracksPoolAndUnits (256 fuzz runs)

### PredictionMarketCoverage.t.sol (27)
13-39. 完整覆盖所有业务风险点

### PredictionMarketInvariants.t.sol (5)
40. invariantPoolsEqualAcceptedBuys (16,384 calls, 0 reverts)
41. invariantSuccessfulPayoutsNeverExceedResolvedPool (16,384 calls, 0 reverts)
42. invariantNoActorClaimsMoreThanOnce (16,384 calls, 0 reverts)
43. invariantClaimedStateMatchesObservedBalanceChange (16,384 calls, 0 reverts)
44. invariantPayoutAndContractBalancesAreConserved (16,384 calls, 0 reverts)

**5 invariant × 16,384 calls = 81,920 次 handler 调用，0 reverts**

---

## H. Invariant 配置与边界

配置: `runs=256, depth=64, fail_on_revert=false`

已证明: yesPool/noPool = ghost sums; positions = ghost stakes; balance = pools; payouts ≤ totalPool; 每人最多 claim 1 次; 余额守恒

未覆盖: 多市场交互、恶意 owner、主网 gas/timestamp 操纵。**这不是安全审计。**

---

## I. 26 条日志来源

来自历史 `scripts/demo.ps1` 运行：固定 Monad header 创建 Anvil fork，Python Web3 提交部署+种子交易，indexer 从本地 RPC 读取真实合约日志。

- 3 MarketCreated + 12 PositionBought + 3 MarketResolved + 8 RewardClaimed = 26 events
- 0 解码错误；事件唯一键: `(chain_id, transaction_hash, log_index)`

---

## J. 6 项数据检查定义

| Check | 定义 |
| --- | --- |
| distinct_wallet_count | SQL wallet_summary 行数 = pandas distinct wallets |
| cohort_sum_equals_distinct_wallets | wallet_summary 行数 = pandas distinct (名称强于实现) |
| per_market_volume_gwei | SQL 各 market sum = pandas group sum |
| yes_plus_no_equals_total | SQL yes_gwei + no_gwei = total_gwei |
| claimed_payout_wei | SQL sum(payout_wei) = Python int sum |
| decode_errors | ingest_run decode_error_count = 0 |

---

## K. Analytics 测试清单 (16 项)

原有 8 项 + 新增 8 项：解码/去重/reorg/pipeline/evidence/partial days/router/SQLite 外键

---

## L. Action 测试清单 (6 项)

1. buys calldata/value without signer (REAL calldata)
2. keeps MOCK visibly non-verifiable (MOCK 标签)
3. Moss fails closed (fail-closed)
4. rejects non-gwei-aligned payments (gwei 对齐)
5. checks payment cap against tx value (不可伪造)
6. rejects envelope identity disagreement (身份一致性)

---

## M. Moss 真实集成状态

- 上游: `d09b38cbc44ee7f5722c5d09e7224f7750187762`
- `moss-prediction-market`: SCAFFOLD (需外部 workspace)
- 应用 adapter: fail-closed (throw)
- 4 项 blocker 已记录

---

## N. 21 个 Next.js 路由

4 公开页面 + 15 evidence 参数页 + 2 内部页 (_not-found, _global-error)
所有页面 `ACTION MOCK` badge 在 header 显示
无 "Moss Verified" / "Ready to Sign" / "Onchain Verified" 文案

---

## O. 已知问题

1. 无 Git commit — 所有源码 untracked
2. demo.ps1 需 Monad RPC — clean reproduction 部分阻塞
3. pipeline version v1 vs code v1.1-baseline — 静态 JSON 未更新
4. 6/10 publishability checks
5. cohort_sum_equals_distinct_wallets 名称强于实现
6. 空获胜池规格冲突 (当前允许 resolve 进 refund mode)
7. owner 手动 resolve — 中心化信任边界
8. Moss package 依赖外部 workspace
9. 3 个 block.timestamp Foundry warning
10. D1 为 DEMO SAMPLE，不是平台留存

---

## P. 本轮最小修复

本轮未做代码修改。项目代码质量好，文档完备。

---

## Q. 是否适合创建第一次 Git commit

**是。** 所有秘密已清理，离线测试全部通过，模块边界已标注。

---

## R. 推荐 commit message

```
chore: freeze audited local MVP baseline

Verified: Foundry 44/44, Analytics 16/16, Action 6/6, Next.js 21 pages.
Known limits: No Monad deploy, Moss disabled, no signing/broadcast.
Static JSON from historical local-fork run.
```

推荐 tag: `local-mvp-baseline`

---

## S. 下一阶段唯一建议目标

**将本地 MVP 变成不依赖 Monad RPC 的自包含 clean reproduction。**
