# Web module

已实现的 Next.js 应用包含四个区域：

1. Markets
2. Product Analytics
3. Evidence
4. Action

分析页面读取 Python 流水线生成的只读 JSON，避免在前端重复定义指标。Action 页面在 signer seam 前停止，不伪装交易已经发送。

运行：`corepack pnpm --filter @marketlens/web dev`。
