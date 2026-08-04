# Monad 黑客松获奖作品与 MarketLens 获奖可能性分析

> 研究日期：2026-08-03  
> 结论适用范围：以公开可核实的 Monad 官方资料、生态伙伴资料和项目方资料为依据；不把营销转述当作评委打分记录。

## 先说结论

MarketLens 的方向不是偏题。它切中一个真实且正在变得重要的问题：**Agent 可以很快地产生和准备链上操作，但用户缺少一个能在签名前同时检查单笔风险与整批组合风险的控制点。** Monad 官方把 agentic commerce、multi-agent systems、可审计/防篡改的 AI 系统列为重点方向，并明确偏好“技术有野心、AI × blockchain 产品构想有说服力、持续交付”的团队。[Monad AI Blueprint（官方）](https://www.monad.xyz/announcements/introducing-monad-ai-blueprint)

但以当前状态直接参赛，MarketLens 最大的问题也很清楚：**它是真实的本地 Moss + Anvil 安全 Demo，却还不是一个真实部署在 Monad 上、可以由评委复验的 Monad 产品。** 这不是措辞问题，而是可能影响参赛资格和评委信任的硬缺口。已有 Monad 活动会明确要求项目必须有 Monad mainnet/testnet 链上组件、托管 Demo、公开仓库和合约地址；例如 Spark 的公开规则就是如此。[Spark 规则页](https://buildanything.so/hackathons/spark?tab=rules)

在不知道本次具体参赛人数、奖项数量和评分权重的情况下，我给出的区间是决策估计，不是统计学预测：

| 状态 | 获得任一技术/赛道奖 | 总冠军或全场第一 |
| --- | ---: | ---: |
| 当前原样提交（仅 REAL LOCAL、未部署 Monad） | **10%–20%** | **2%–5%** |
| 若本次规则强制 Monad 部署 | **0%（资格不满足）** | **0%** |
| 补齐 Monad testnet 复验证据、公开在线 Demo、90 秒强叙事 | **30%–50%** | **6%–12%** |
| 再补 3–5 位目标用户验证和一个真实外部 Agent 输入案例 | **40%–60%** | **10%–18%** |

我的直白判断是：**当前是有获奖辨识度的技术作品，但还不是冠军完成态。** 它的上限不低，最值得保留的“冠军镜头”是 `prop-005`：单笔 Moss 与 action policy 都通过，却因整批中存在相反结果而被 batch policy 阻止。这个差异比“又一个会交易的 AI Agent”更独特。

## 资料可信度说明

- **官方**：Monad Foundation / Monad Dev 官方页面或账号；用于确认活动、名次、方向和项目简述。
- **生态伙伴**：0x、Turnkey 等主办支持方；用于确认专项奖和集成评价。
- **项目方**：项目官网、原始仓库、Demo 或创作者发布；用于理解实际产品能力。
- **分析推断**：本文根据公开事实总结的共同特征，不声称是未公开的评委评分理由。

Monad 官方没有公开 evm/accathon 的逐项评分表或每位评委评语。因此下面的“为什么值得参考”是有来源约束的分析，而不是“官方说它因为这一条获奖”。

## 可核实获奖案例

### 1. KiSignals — evm/accathon 2025 第一名、0x 专项奖

- **获奖事实（官方）**：Monad Dev 官方获奖串将 KiSignals 列为第一名；活动奖金页显示第一名对应 20,000 USDC、5,000 美元基础设施额度与 Builder Residency。[Monad 官方获奖串](https://x.com/monad_dev/status/1909364883046711661) · [官方活动与奖金页](https://hackathon.monad.xyz/)
- **做了什么（官方/伙伴）**：把 Telegram alpha 信息聚合、AI 情绪分析和交易执行连接成一条路径，用户可直接依据社交信号交易；0x 确认它赢得 5,000 美元 Swap API 专项奖。[0x 官方获奖复盘](https://0x.org/post/0x-bounty-showcase-from-monad-hackathon)
- **伙伴公开评价**：0x 强调它是一个连贯产品，把 Telegram 信息快速、自动地转为交易，并且 0x 执行集成自然地处在主流程中。
- **可学习特征（分析推断）**：不是展示“用了 AI”和“用了 API”，而是用户能完成一个清楚的端到端动作：**看到信号 → 理解信号 → 完成交易**。集成不是装饰。

### 2. StageFun — evm/accathon 2025 第二名

- **获奖事实（官方）**：Monad Dev 官方获奖串列为第二名；活动奖金页显示第二名对应 12,000 USDC、5,000 美元基础设施额度与 Builder Residency。[Monad 官方获奖串](https://x.com/monad_dev/status/1909364883046711661) · [官方活动页](https://hackathon.monad.xyz/)
- **做了什么（官方）**：让用户众筹自己的活动，并用后续门票和赞助收入偿还支持者。
- **项目延续证据（项目方）**：Blocklive 目前仍提供完整的链上活动管理、票务、付款、核销和粉丝互动产品，而非只留下一页黑客松截图。[Blocklive 官网](https://blocklive.io/) · [Blocklive 产品文档](https://blocklive.gitbook.io/docs)
- **可学习特征（分析推断）**：它把链上机制藏在一个普通用户能理解的业务闭环里：**为活动融资 → 举办活动 → 用真实收入回款**。问题、用户和资金流都能一句话说清。

### 3. OwnPay — evm/accathon 2025 第三名

- **获奖事实（官方）**：Monad Dev 官方获奖串列为第三名；活动奖金页显示第三名对应 8,000 USDC、5,000 美元基础设施额度与 Builder Residency。[Monad 官方获奖串](https://x.com/monad_dev/status/1909364883046711661) · [官方活动页](https://hackathon.monad.xyz/)
- **做了什么（官方）**：提供类似 Apple Pay 的即时、非接触式链上支付体验，强调安全、快速、全链上。
- **可学习特征（分析推断）**：用人们已经熟悉的消费行为解释 Web3，而不是先教育用户一套协议术语。演示动作极短：**靠近/确认 → 支付完成**。

### 4. Gorillionaire — evm/accathon 2025 第四名

- **获奖事实（官方）**：Monad Dev 官方获奖串列为第四名；第四、第五名获得 Builder Residency 和导师支持。[Monad 官方获奖串](https://x.com/monad_dev/status/1909364883046711661) · [官方活动页](https://hackathon.monad.xyz/)
- **做了什么（官方/项目方）**：分析链上与市场数据，生成实时 BUY/SELL 信号并允许执行；产品加入排行榜和竞争机制。[Gorillionaire 官网](https://www.gorillionai.re/) · [Monad 生态目录](https://www.monad.xyz/ecosystem?5b6c3914_page=1)
- **生态伙伴评价**：0x 的复盘指出，它把实时 AI 交易、即时执行和游戏化结合起来，竞争反馈让产品更有持续参与感。[0x 官方复盘](https://0x.org/post/0x-bounty-showcase-from-monad-hackathon)
- **可学习特征（分析推断）**：既有技术主线，也有评委一眼能看懂的视觉反馈与用户循环。技术复杂度没有压过 Demo 的可读性。

### 5. StitchAI — evm/accathon 2025 第五名

- **获奖事实（官方）**：Monad Dev 官方获奖串列为第五名。[Monad 官方获奖串](https://x.com/monad_dev/status/1909364883046711661)
- **做了什么（官方）**：为 AI Agent 提供平台无关的记忆层，让 Agent 的经历可以跨平台保存和共享；官方获奖串同时链接了项目演示。[项目 Demo（官方获奖串所附）](https://youtu.be/UNR6uhHT1G0)
- **可学习特征（分析推断）**：它不是又一个聊天界面，而是可被许多 Agent 产品复用的基础模块。Monad 后来的 AI Blueprint 也把“让 AI 推理可审计、防篡改的 verifiable memory systems”列为重点场景，说明这一类可验证 Agent 基础设施与生态方向长期一致。[Monad AI Blueprint](https://www.monad.xyz/announcements/introducing-monad-ai-blueprint)

### 6. Butter-Fi — evm/accathon 2025 Turnkey 最佳使用奖

- **获奖事实（官方）**：Monad Dev 官方获奖串将 Butter-Fi 列为 Best Use of Turnkey 获奖者。[Monad 官方获奖串](https://x.com/monad_dev/status/1909364883046711661)
- **做了什么（项目方）**：团队将其描述为 AI 驱动的 chat-to-stake 产品，用户用自然语言完成质押、收益与交易操作；Turnkey 被用于嵌入式钱包和密钥安全，项目方称专项奖金为 5,000 USDC。[项目团队公开说明](https://www.linkedin.com/posts/jill-chang-_im-crying-thanks-to-the-monad-foundation-activity-7306670844456407040-urJ3)
- **可学习特征（分析推断）**：它没有只在技术栈列表里写 Turnkey，而是让 Turnkey 直接解决 Agent 代表用户操作时最敏感的密钥与权限问题。专项奖通常尤其看重这种**主流程中的深集成**。

### 7. Sheriza AI — evm/accathon 2025 Wormhole 多链专项奖

- **获奖事实（官方）**：Monad Dev 官方获奖串将 Sheriza AI 列为 Best Multi-chain Build with Wormhole 获奖者。[Monad 官方获奖串](https://x.com/monad_dev/status/1909364883046711661)
- **公开资料边界**：官方获奖串可以确认奖项与 Wormhole 集成，但本次检索没有找到足以可靠复述其完整用户流程的项目原始页面，因此不补写未经核实的产品细节。
- **可学习特征（有限推断）**：专项奖至少证明了一个基本规律：赞助方能力必须落在可演示、可验证的跨链主流程中。不能仅出现 Logo 或依赖包。

## 获奖作品的共同形状

以下是从上述案例和官方项目方向中归纳出的偏好，不是公开评分权重：

1. **一个动作就能说明价值。** KiSignals 是从聊天信号到交易，StageFun 是从众筹到票房回款，OwnPay 是一次即时付款。评委不需要先听五分钟架构。
2. **真实集成在关键路径上。** 0x 不只是报价接口，而是 KiSignals 和 Gorillionaire 的执行层；Turnkey 不只是钱包 Logo，而是 Butter-Fi 的安全操作基础。
3. **既有技术差异，也有可见结果。** AI 分析、链上执行、跨链或记忆层最终都变成用户能看到的结果，而不是藏在 README 的技术名词。
4. **Monad 不是任意可替换的标签。** 官方活动要求作品利用高性能 EVM；当前生态项目支持计划更进一步要求功能产品、Monad 部署计划、可持续运营和真实用户行为。[evm/accathon 官方页](https://hackathon.monad.xyz/) · [Monad Momentum 官方说明](https://www.monad.xyz/announcements/monad-momentum-accelerating-ecosystem-growth)
5. **可持续项目比一次性 Demo 更有说服力。** evm/accathon 官方明确寻找愿意长期在 Monad 生态建设的团队，并把后续 Residency 与里程碑支持放进奖励设计。[evm/accathon 官方页](https://hackathon.monad.xyz/)
6. **AI 方向要求“Agent 深度”，不只是套一层聊天框。** Monad AI Blueprint 点名 agentic commerce、多 Agent 协作、可验证记忆和可审计系统，并强调技术野心、产品构想和持续交付。[Monad AI Blueprint](https://www.monad.xyz/announcements/introducing-monad-ai-blueprint)

## MarketLens 与获奖作品对照

MarketLens 当前能力依据本仓库的 [README](../README.md)、[Phase 4A-R2 审计](phase4a-batch-implementation-audit.md) 与 [Final Pitch](final_pitch.md)；它明确标注 REAL LOCAL、UNSIGNED、NOT BROADCAST、NOT DEPLOYED ON MONAD。

| 评审维度 | MarketLens 当前状态 | 判断 |
| --- | --- | --- |
| 用户问题 | Agent 批量操作在签名前缺少单笔 + 整批策略审查 | **强**：问题具体，风险真实 |
| 核心动作 | 调整 User Policy，审查 5 笔 Proposal，查看 Moss/Anvil evidence 与 Receipts，下载 unsigned allowlist | **强**：闭环已经成立 |
| 技术真实性 | 真实 Moss adapter、local Anvil `debug_traceCall`、canonical JSON receipt hash、action/batch 两层裁决 | **很强**：远高于纯前端 Mock |
| 独特性 | `action PASS / batch BLOCKED`，把组合风险与单笔执行风险区分开 | **很强**：最可能形成记忆点 |
| Moss 深度 | 每笔 Proposal 经过真实 Moss adapter，失败包含真实 revert evidence | **强**：必须在视频里现场证明，不只口述 |
| 用户可理解性 | 五步流清楚，但 Receipt、canonical hash、allowlist 容易变成工程术语堆叠 | **中上**：需要先讲损失场景，再讲证据 |
| Monad 必要性 | 当前只是“未来适合高速 Agent batches”的叙事 | **弱**：尚无 Monad RPC、合约地址或浏览器证据 |
| 可复验性 | 本地测试与截图充分 | **强（工程）/弱（评委访问）**：仍需公开在线 Demo |
| 用户验证 | 仓库材料未显示真实 Agent builder / wallet user 访谈或外部使用记录 | **弱** |
| 后续生命力 | 可演进为钱包/Agent runtime 的 pre-sign policy layer | **中上**：还需证明接入接口与采用路径 |

## 为什么当前不是高概率冠军

### 1. “适合 Monad”还没有变成“必须用 Monad”

本地 Anvil 证明了 EVM 执行真实性，却不能证明 Monad 集成。评委很可能追问：既然代码可以在任意 EVM 上做 dry-run，为什么这是 Monad 项目？现有答案“Monad 很快，所以 Agent batch 更需要安全”方向正确，但仍是论点，不是运行证据。

### 2. 固定的五笔 synthetic proposal 容易被看成精心编排的测试夹具

固定案例非常适合稳定录屏，但冠军级作品最好再证明：相同引擎可以接受一个外部 Agent 生成的新 batch，而不是只对五个已知 ID 正确。无需扩成通用平台，只需增加一个可复验的外部输入案例。

### 3. 工程证据多，用户需求证据少

211 个测试能证明实现严谨，却不能证明 Agent 开发者或钱包用户愿意使用。与 StageFun、OwnPay 这类“一眼看懂”的产品相比，MarketLens 必须先让评委感受到“Agent 单笔都合法但组合起来伤害用户”的瞬间，再展示哈希和 Receipt。

### 4. 目前的产物停在 unsigned allowlist

这条安全边界本身是正确的，而且不应为了演示接入私钥或自动广播。但需要把 allowlist 的下游位置讲清：它是给钱包、Agent runtime 或审批系统消费的**签名前决策工件**，不是一份只能人工阅读的报告。

## 提升获奖概率的最小补齐顺序

### P0：先确认本次规则是否强制 Monad 部署

若强制，则在获得项目负责人明确授权后，增加最小 Monad testnet 验证：

- 一个无资金风险的测试合约或现有 fixture 部署地址；
- Monad RPC 的真实 `eth_call` / trace 证据、chain id、block reference；
- 浏览器可点击的合约/交易或只读状态链接；
- UI 继续明确 UNSIGNED、NOT BROADCAST，不能为了“链上”而加入危险签名路径。

这一步预计是从当前 10%–20% 提升到 30% 左右的最大杠杆。如果当前比赛规则不要求部署，也至少应提供可切换的 Monad testnet read-only evidence adapter。

### P1：加一个外部 Agent batch 输入案例

不要扩成功能繁多的 Agent 平台。只需要让一个简单 Agent 或公开 JSON endpoint 产生 3–5 笔 unsigned proposals，随后复用同一条：

`Agent proposals → User policy → Moss evidence → Action receipts → Batch verdict`

评委看到引擎对未知输入也能 fail closed，便能把它从“精致测试夹具”理解为产品原型。

### P1：完成公开在线 Demo 与 90 秒视频

- 0–15 秒：一个 Agent 准备了五笔操作；逐笔看似正常，但组合起来可能冲突。
- 15–40 秒：用户设置 policy，真实 Moss/trace 抓住超限和 revert。
- 40–60 秒：重点放大 `prop-005 action PASS / batch BLOCKED`。
- 60–75 秒：显示 `2 OF 5 ELIGIBLE`、`0 SIGNED`、`0 BROADCAST`。
- 75–90 秒：下载 unsigned allowlist，并用一句话定位它是钱包/Agent runtime 的 pre-sign control plane。

### P2：做最轻量的用户验证

找 3–5 位 Agent builder、钱包开发者或重度链上用户，每人只问三题：

1. 你是否让 Agent 一次准备过多笔链上操作？
2. 现有 simulator 能否发现跨交易冲突或总额超限？
3. 你更愿意在什么位置消费 allowlist/receipt：钱包、Agent runtime 还是审批后台？

把真实回答转为首页的一句需求证据和一个接入决策即可，不需要做大规模调研。

## 最终判断

MarketLens 的创新点不是“AI 帮用户交易”，而是：

> **Agent proposes; Moss proves each action; user policy decides what the batch is allowed to become before any signature exists.**

往届第一名 KiSignals 胜在极完整、极易理解的动作闭环；StageFun 和 OwnPay 胜在具体用户问题；StitchAI 胜在可复用的 Agent 基础设施方向；Butter-Fi 胜在赞助方技术进入了产品主流程。MarketLens 已经拥有其中三项优势：具体风险、真实技术、独特的 batch-level verdict。它现在最缺的是第四项：**让 Monad 自身进入可复验的主流程，并证明真实用户或外部 Agent 会把这个 firewall 放在签名前。**

因此建议是：**值得继续冲奖，不建议推倒重做；也不建议继续增加泛化功能。** 下一轮全部资源应集中在 Monad 复验证据、一个外部 Agent 输入、公开在线 Demo 和 90 秒叙事。这四项比再增加十条 policy rule 更能提高获奖率。

