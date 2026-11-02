---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: ["src/components"]
---

## Scope

整個 App（今天、晚上回顧、待辦、設定、登入）。Mode: operate。手機優先（iPhone PWA），電腦也要能用。

## Direction contract

THESIS: 一本每天換一種霧色封面的日系生活雜誌。打開先讀到今天的一句話，再看今天的行程與三件事。拒絕的預設：白底清單＋圓形勾選框的待辦 App。

OWN-WORLD: 整個畫面一片霧色（週一霧藍、週二灰綠、週三灰紫、週四灰玫瑰、週五灰青、週六暖灰、週日灰藍），卡片是同色系再亮一階的半透明白，6px 小圓角，沒有陰影。白字。英文與數字用 EB Garamond（星期用斜體大字），中文用思源宋體（明體）。分段標題是斜體英文小字加一條細底線。項目前面是小圓點；行程的點用當天的暖色點綴。

STORY: 他早上打開，先看到斜體大字的星期與日期，接著是今天的思考題，讀完才往下看行程和最該先做的三件事；工作中空檔單手按右下角的＋記一件事；晚上看回顧草稿、調整明天、按確認。

FIRST VIEWPORT: 上方左對齊斜體 `Tuesday`（約 50px），下面小字大寫字距 `NOVEMBER 3`；右上角 Morning／Evening 斜體小字切換。接著「Thought of the day」與思考題卡片（題目 17px 明體），再往下 Schedule、First three。底部浮起的圓角工具列：TODAY／TASKS／SETTINGS 與白色圓形＋（主要動作）。

FORM: 日系生活風格雜誌（使用者從 Timepage「Sunday」畫面與三款日系樣稿中選定；使用者指定的方向優先於擲骰結果），seed:c04c2b71c80113ec

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Signature

每天的底色跟著星期換（一週七種霧色），一看就知道今天星期幾；雜誌式的斜體英文星期當刊頭。

## Constraints

- 觸控目標至少 44px；底部工具列與＋固定在拇指可及處。
- 工作時段可以一次套用多天。
- 待辦不搶思考題的位置；教室其他課收合。
