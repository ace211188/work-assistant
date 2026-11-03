# 雲端排程

四個 Claude 雲端排程（routine）負責所有需要 AI 的工作，網頁 App 本身不呼叫 AI。完整重建步驟見 [../重建手冊.md](../重建手冊.md)。

| 排程 | 時間（台北） | cron（UTC） | 指令 |
|---|---|---|---|
| 個人助理｜早上 | 每天 7:00 | `0 23 * * *` | [morning.md](morning.md) |
| 個人助理｜中午 | 每天 12:00 | `0 4 * * *` | [midday.md](midday.md) |
| 個人助理｜晚上 | 每天 22:00 | `0 14 * * *` | [evening.md](evening.md) |
| 個人助理｜回饋 | 08:30–21:30 每小時 | `30 0-13 * * *` | [feedback.md](feedback.md) |

- 連接器只開 **Supabase**（讀寫 `pa_` 表格）和 **Google Calendar**（只讀教室行事曆；中午不需要）
- **排程絕對不下 `DELETE`**：Supabase 連接器會要求人工確認，排程沒人能按會卡住
- 雲端沙盒不能直接連外部網址，所有資料都走連接器
- 排程的指令內容就是這兩個檔案；修改後要同步更新 claude.ai/code/routines 上的排程
- 寫入 `pa_briefs` 時，資料庫觸發器會呼叫 `pa-push` 推播（每則只通知一次）

## 早晚內容格式（`pa_briefs.content`）

### 早上（kind = morning）

```json
{
  "push": { "title": "早安 🌅", "body": "一句話預告今天的思考題" },
  "greeting": "一兩句開場，點出今天的重點",
  "thought_id": 12,
  "free_slots": [{ "start": "10:00", "end": "12:00", "kind": "work" }],
  "top3": [{ "todo_id": 5, "slot": "10:00–11:00", "reason": "週五截止，今天先完成初稿" }],
  "stale": [{ "todo_id": 3, "message": "「整理老師合約」已經延了 3 次，還要做嗎？" }],
  "ideas": [{ "inbox_id": 8, "text": "暑假可以辦親子音樂營" }]
}
```

### 中午（kind = midday）

沒有 `push` 欄位就不推播（下午沒有變動時）。

```json
{
  "push": { "title": "下午重排好了 ☀️", "body": "體驗券改到 16:30 處理" },
  "summary": "一句話說上午的狀況和下午的重點",
  "new_todo_ids": [9],
  "ideas": [{ "inbox_id": 10, "text": "成果發表會可以請家長幫忙錄影" }],
  "afternoon": {
    "plan": [{ "todo_id": 5, "start": "16:30", "end": "17:30", "reason": "早上沒做到，今天一定要送出" }],
    "free_slots": [{ "start": "16:30", "end": "18:00", "kind": "work" }]
  }
}
```

### 晚上（kind = evening）

```json
{
  "push": { "title": "今天辛苦了 🌙", "body": "完成 4 件，明天的排程草稿好了" },
  "summary": "一兩句回顧今天",
  "done_ids": [1, 2],
  "undone_ids": [5],
  "stale": [{ "todo_id": 5, "message": "這件延第二次了，是卡在哪裡？" }],
  "tomorrow": {
    "date": "2026-11-03",
    "plan": [{ "todo_id": 5, "start": "10:00", "end": "11:00", "reason": "早上精神最好，先處理最難的" }],
    "free_slots": [{ "start": "10:00", "end": "12:00", "kind": "work" }]
  },
  "ask_private": "明天有私人行程嗎？",
  "reflection_question": "今天哪件事最值得？",
  "user_note": "（使用者確認時由 App 寫入）"
}
```
