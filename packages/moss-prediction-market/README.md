# Moss prediction-market Protocol package

Protocol package 已在固定 Moss 提交的上游工作区中通过 build、typecheck 与离线测试。
**没有声称 live Moss simulation 已完成。**

已完成或保持的约束：

1. 从 `nishuzumi/moss` 当前模板复制，而不是手写猜测；
2. 固定到 `d09b38cbc44ee7f5722c5d09e7224f7750187762` 或一个后续明确 release；
3. 从编译后的 MarketLens 合约源码生成完整 ABI；
4. 为固定地址记录部署来源并做 bytecode check；
5. 每个 Capability 只有一个 direct TransactionNode 和一个纯 Receipt parser；
6. Receipt 覆盖 ordered Changes 的对象 identity、长度和顺序；
7. zero-Warning live simulation 尚未完成，因此 application adapter fail closed；
8. 不签名、不广播交易。

仓库保存 `patches/moss-vocabulary.patch`，用于在固定源码工作区加入最小
prediction-market vocabulary。上游发布版仍未提供该 vocabulary，详见
[Moss 调研](../../docs/moss_research.md)。
