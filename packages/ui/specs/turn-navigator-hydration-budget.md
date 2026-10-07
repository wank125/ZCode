# 问题目录全量补拉的行数预算

## 行为

`ConversationProjectionStore.loadAllOlder()` 沿 rows/range 游标把当前有效分支
的历史 rows 分批（单批受协议 `rowsRangeMaxLimit = 200` 限制）拉进 renderer，
用于宽屏问题目录与分享前的完整目录水合。本 spec 在该路径上增加**总量预算**：
累计补拉行数超过 `CONVERSATION_TURN_NAVIGATOR_HYDRATION_MAX_ROWS`（默认 5000）
时，丢弃已拉页面并返回 `budget-exceeded`，目录维持 tail window 的部分视图。

## 为什么需要

协议层只限制单批、不限制总量；`mergeOlderRows` 为纯拼接、snapshot window 无
上限。超长会话（7000+ 消息 ≈ 2 万+ rows）恢复或宽屏挂载问题目录时，全量历史
常驻 renderer projection 导致 V8 old space 耗尽（实测 2.18GB 后 OOM，renderer
exit code 5，表现为窗口闪退且随会话恢复循环复现）。

## 所有权与不变量

- 预算常量与判定函数属于 `packages/ui/src/v4/conversationTurnNavigatorHelpers.ts`
  （纯函数，可单测）；消费方为 `conversationProjectionStore.loadAllOlder` 与
  `ConversationTimeline` 的水合结果处理。
- 超限判定发生在每批 `pages.push` 之前：**到达上限恰好不触发**（该批仍可合并），
  超出才触发——保证合法会话不会因边界差一行而丢目录。

## 失败语义

- `budget-exceeded` 是**确定性终态**：写入 `turnNavigatorHydrationTerminal`
  （logEpoch + directoryRevision 失效语义与 hydrated/not-enough-queries 一致），
  不进入退避重试——重试只会重复拉取同样的超预算历史。
- 终态失效条件不变：logEpoch 变化或 directoryRevision 递增（real-user query
  增删）后允许重新探测，结论仍由预算决定。

## 迁移边界

- 不改变 `hydrated` / `not-enough-queries` / `retryable-failure` / `stale` 的
  既有语义；宿主（分享）与渲染（问题目录）两个触发方共用同一预算路径。
- 预算量级选择：≥1000 保证常规会话（数百轮）不受影响；≤20000 显著低于已知
  OOM 案例的行数；默认 5000 为折中值，后续如需调整只改常量一处。
