import type { Thought } from "./types";

const BASE = "https://claude.ai/new?q=";

// 「和 Claude 討論」：把內容和背景帶進 Claude App（用現有訂閱，不另外付費）
export function discussThoughtUrl(thought: Thought, direction: string | null) {
  const lines = [
    "我是序曲音樂學院的宇群。這是我的個人助理今天早上給我的思考內容，想跟你討論。",
    "",
    `【${thought.title}】`,
    thought.body,
    thought.question ? `\n思考題：${thought.question}` : "",
    thought.source_url ? `\n來源：${thought.source_url}` : "",
    direction ? `\n我目前的方向：\n${direction}` : "",
    "",
    "請先問我一兩個問題，幫我把這個想法套用到序曲的實際狀況。討論最後，請用三句話幫我整理結論，方便我存回助理。",
  ];
  return BASE + encodeURIComponent(lines.filter((l) => l !== "").join("\n"));
}

export function discussEveningUrl(summary: string, undone: string[]) {
  const text = [
    "我是序曲音樂學院的宇群。想用聊天的方式回顧今天、排明天。",
    summary ? `助理對今天的整理：${summary}` : "",
    undone.length ? `今天沒做完的：${undone.join("、")}` : "",
    "請像教練一樣問我問題，幫我想清楚卡在哪裡、明天最該先做什麼。最後用條列幫我整理明天的安排。",
  ];
  return BASE + encodeURIComponent(text.filter(Boolean).join("\n"));
}
