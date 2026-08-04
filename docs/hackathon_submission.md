# MarketLens — Hackathon Start Card

## 项目信息

**项目名称（暂定）**
MarketLens — Agent Batch Policy Firewall

**一句话介绍**
在钱包签名之前，用用户策略、Moss 模拟证据和可验证 Receipt 拦截不安全的 Onchain Agent 批量操作。

**目标用户**
希望让 AI Agent 代表自己准备链上操作、但不愿把最终控制权交给 Agent 的 Web3 用户与 Agent 开发者。

**想解决的问题**
单笔 Agent 操作看起来安全，不代表整批操作放在一起仍然安全。金额超限、真实执行 revert、同一市场互相冲突等问题，必须在签名前被解释清楚并阻止。

## Demo 计划

**用户可以完成的一个核心动作**
审查 5 笔 Agent Proposal，应用自己的批次策略，查看 Moss/Anvil 执行证据和 Action Receipts，最终得到由真实批次引擎计算的 Batch Verdict。

**为什么适合 Monad**
Monad 的高吞吐和低延迟适合 Agent 批量准备链上操作；批量越快、越自动化，签名前的策略防火墙越重要。当前 Demo 的目标环境是 Monad Agent batches，但证据运行时明确使用本地 Anvil chain 143，没有伪装成 Monad 部署。

**是否使用 Moss（如果使用，在哪里）**
使用。每笔 Proposal 都经过 `@marketlens/moss-prediction-market` 适配器和 `@themoss/simulator`，再由本地 Anvil `debug_traceCall` 生成执行证据。浏览器展示并重新校验发布的规范化 Receipt，不在前端伪装现场链上执行。

## 开发范围

**本次一定要完成什么？**

- 单入口五步流程：Proposal → User Policy → Moss Evidence → Action Receipts → Batch Verdict
- 固定且可复验的 5 笔案例：2 eligible、3 blocked、0 signed、0 broadcast
- 真实 losing-claim revert 证据：`NothingToClaim`
- 核心创新案例：action-level PASS、batch-level BLOCKED
- Receipt hash 基于 canonical JSON 在运行时生成和校验
- 桌面与 390px 移动端可演示、无横向溢出

**哪些部分可以使用组件 / Mock？**

- Agent Proposal 使用确定性本地 planner 和合成市场快照
- 链状态使用本地 Anvil fixture
- UI 动画只负责逐条揭示已生成、已校验的运行时证据

**本次明确不做什么？**

- 不连接钱包，不使用私钥
- 不签名、不广播、不执行真实交易
- 不部署 Monad，不声称本地 Anvil 是 Monad
- 不做通用 Agent 平台、复杂策略编辑器或生产索引服务

## 团队信息

**团队成员与分工**
Yuhang Xian — 全栈开发：Solidity / Foundry、Moss 适配、批次策略引擎、TypeScript / Next.js、演示与验证。

**下一步最先完成什么？**
录制一条 90 秒、严格对应五步真实证据链的演示视频，并把 Monad testnet fork 验证作为后续里程碑。

**当前最大风险是什么？**
评委可能把“浏览器中的证据揭示动画”误解为前端现场模拟。演示必须明确：真实 Moss + Anvil 运行发生在工件生成阶段，浏览器会对规范化工件再次做完整性校验。

## 当前可提交材料

- GitHub Repo：本仓库
- Demo 截图：`artifacts/phase4a-agent-batch/`
- 技术边界与证据：`docs/phase4a-batch-implementation-audit.md`
