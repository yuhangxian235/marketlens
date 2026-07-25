# SQL ownership

关键 SQL 必须独立保存在本目录，不嵌入 Python 字符串。

已实现文件：

- `schema.sql`
- `normalize_events.sql`
- `wallet_first_seen.sql`
- `wallet_repeat_participation.sql`
- `market_activity.sql`
- `cross_market.sql`
- `data_quality.sql`
- `questions/most_first_touch_wallets.sql`
- `questions/low_repeat_participation.sql`
- `questions/multi_market_wallets.sql`

所有日期边界在 SQL 中显式使用 `DATE(...)` 或半开 timestamp interval；不得把带时间的文本字段直接与日期字符串比较。

自然语言功能只能路由到这三个只读模板，并使用绑定参数、结果行数限制和 SQLite progress-handler 超时；不得执行模型生成的任意 SQL。
