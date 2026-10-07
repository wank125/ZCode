import assert from "node:assert/strict";
import test from "node:test";
import {
  CONVERSATION_TURN_NAVIGATOR_HYDRATION_MAX_ROWS,
  exceedsConversationTurnNavigatorHydrationBudget,
} from "../src/v4/conversationTurnNavigatorHelpers.js";

test("预算守卫：恰好到达上限不触发（本批仍可合并）", () => {
  assert.equal(
    exceedsConversationTurnNavigatorHydrationBudget(
      CONVERSATION_TURN_NAVIGATOR_HYDRATION_MAX_ROWS - 200,
      200,
    ),
    false,
  );
});

test("预算守卫：超出一行即触发", () => {
  assert.equal(
    exceedsConversationTurnNavigatorHydrationBudget(
      CONVERSATION_TURN_NAVIGATOR_HYDRATION_MAX_ROWS - 199,
      200,
    ),
    true,
  );
});

test("预算守卫：首批就超限的长页也触发", () => {
  assert.equal(exceedsConversationTurnNavigatorHydrationBudget(0, 50_001), true);
});

test("预算常量：正整数，且量级足以约束超长会话又不误伤常规会话", () => {
  assert.ok(Number.isInteger(CONVERSATION_TURN_NAVIGATOR_HYDRATION_MAX_ROWS));
  assert.ok(CONVERSATION_TURN_NAVIGATOR_HYDRATION_MAX_ROWS > 0);
  // 常规会话（数百轮）远低于预算；已知 OOM 案例约 2 万+ rows，预算必须显著小于它。
  assert.ok(CONVERSATION_TURN_NAVIGATOR_HYDRATION_MAX_ROWS >= 1_000);
  assert.ok(CONVERSATION_TURN_NAVIGATOR_HYDRATION_MAX_ROWS <= 20_000);
});
