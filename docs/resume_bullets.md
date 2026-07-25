# Resume bullets

## Accurate after Phase 0

### 中文

- 为 Monad 预测市场分析 MVP 设计端到端架构，覆盖 Solidity 事件、幂等链上索引、SQLite/SQL、pandas 交叉验证、证据目录与 Next.js 展示。
- 审计 Moss 官方源码、Protocol package 模板、Capability tree、`debug_traceCall` 模拟和 exhaustive Receipt 约束，识别 npm 发布版与主分支接口漂移并制定 commit pinning 方案。
- 定义地址级 first-seen、D1、重复参与和跨市场指标，显式处理 UTC partial-day、样本偏差和非因果解释。

### English

- Designed an end-to-end Monad prediction-market analytics architecture spanning Solidity events, idempotent indexing, SQLite/SQL, pandas reconciliation, evidence catalogs, and Next.js delivery.
- Audited Moss source, Protocol package templates, Capability trees, trace simulation, and exhaustive Receipt invariants; identified release/main API drift and defined a commit-pinning strategy.
- Specified address-level first-seen, D1, repeat-participation, and cross-market metrics with explicit UTC partial-day eligibility and non-causal interpretation guardrails.

## Accurate after Phase 1

### 中文

- 使用 Solidity/Foundry 实现并测试二元 pari-mutuel 预测市场，在固定 Monad 本地 fork 上生成 27 笔可复现交易，并从 26 条合约日志重建分析数据集。
- 构建 Python + SQLite 链上数据流水线，以 `(chain_id, transaction_hash, log_index)` 幂等去重，使用独立 SQL 与 pandas/Python 对 6 项关键质量约束进行交叉验证。
- 在固定 Moss 源码提交上实现并验证 prediction-market Protocol package，同时以 fail-closed adapter 和显式 `MOCK_ONLY` 约束隔离尚未具备充分 metadata 的在线模拟。
- 将 first-seen、D1、重复参与及跨市场行为转化为证据化产品洞察；每项指标可回溯至 SQL、区块范围和样本交易哈希。

### English

- Built and tested a binary pari-mutuel prediction market in Solidity/Foundry, generated 27 reproducible transactions on a pinned local Monad fork, and rebuilt the analytical dataset from 26 contract logs.
- Developed a Python/SQLite on-chain pipeline with idempotent `(chain_id, transaction_hash, log_index)` event keys and independently reconciled six critical quality constraints in SQL and pandas/Python.
- Implemented and verified a prediction-market Protocol package against a pinned Moss source commit, while isolating the metadata-incomplete live simulator behind a fail-closed adapter and explicit `MOCK_ONLY` constraint.
- Translated first-seen, D1, repeat-participation, and cross-market behavior into evidence-backed product insights traceable to SQL, block ranges, and sample transaction hashes.
