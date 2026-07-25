# Contracts module

已实现的独立 Foundry module：

```text
contracts/
├── foundry.toml
├── src/PredictionMarket.sol
├── script/Deploy.s.sol
└── test/
    ├── PredictionMarket.t.sol
    ├── PredictionMarketCoverage.t.sol
    └── PredictionMarketInvariants.t.sol
```

`PredictionMarket.sol` 实现手动解决的二元 pari-mutuel 市场、比例领取和
zero-winner refund。运行 `forge test` 执行 44 项 unit、fuzz 与 stateful invariant 测试。
接口与信任边界见[合约规格](../docs/contract_spec.md)。
