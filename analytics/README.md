# Analytics module

已实现：

- RPC 分块索引与可恢复 checkpoint；
- ABI 严格解码；
- 原始事件幂等写入；
- 规范化事件表与汇总表；
- 独立 SQL 文件；
- pandas/Python exact-integer 交叉验证；
- Evidence JSON 导出。

`data/marketlens.sqlite` 与 `web/public/data/*.json` 由 `scripts/demo.ps1`
生成。该脚本需要 Monad RPC 来创建本地 fork；Phase 1.5 的禁网审计没有重新生成
这些文件，当前网页 JSON 应视为历史 demo 的静态快照。
