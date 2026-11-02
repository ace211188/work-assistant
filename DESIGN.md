---
name: 個人助理
description: 一本每天換一種霧色封面的日系生活雜誌：先讀今天的一句話，再看行程與三件事。
colors:
  mist-sunday: "#596279"
  mist-monday: "#526478"
  mist-tuesday: "#566655"
  mist-wednesday: "#685e77"
  mist-thursday: "#765b60"
  mist-friday: "#4c666b"
  mist-saturday: "#616265"
  dot-sunday: "#ffd0a0"
  dot-monday: "#ffd3a3"
  dot-tuesday: "#ffe29a"
  dot-wednesday: "#ffc9a8"
  dot-thursday: "#ffe0a3"
  dot-friday: "#ffdda1"
  dot-saturday: "#bfe0ff"
  paper-white: "#ffffff"
  card: "color-mix(in srgb, var(--bg, #566655) 88%, white)"
  ink: "color-mix(in srgb, var(--bg, #566655) 70%, black)"
  bar: "color-mix(in srgb, var(--bg, #566655) 80%, black)"
  line: "rgb(255 255 255 / 0.42)"
typography:
  display:
    fontFamily: "EB Garamond, serif"
    fontSize: "50px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "-0.01em"
  dateline:
    fontFamily: "EB Garamond, serif"
    fontSize: "13px"
    fontWeight: 500
    letterSpacing: "0.3em"
  section:
    fontFamily: "EB Garamond, Noto Serif TC, serif"
    fontSize: "20px"
    fontWeight: 500
    letterSpacing: "0.01em"
  title:
    fontFamily: "EB Garamond, Noto Serif TC, serif"
    fontSize: "19px"
    fontWeight: 600
    lineHeight: 1.6
  question:
    fontFamily: "EB Garamond, Noto Serif TC, serif"
    fontSize: "17px"
    fontWeight: 500
    lineHeight: 1.75
  body-reading:
    fontFamily: "EB Garamond, Noto Serif TC, serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.9
  body:
    fontFamily: "EB Garamond, Noto Serif TC, serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.375
  meta:
    fontFamily: "EB Garamond, Noto Serif TC, serif"
    fontSize: "13.5px"
    fontWeight: 400
    letterSpacing: "0.02em"
  label-nav:
    fontFamily: "EB Garamond, serif"
    fontSize: "12px"
    fontWeight: 400
    letterSpacing: "0.16em"
  label-tag:
    fontFamily: "EB Garamond, Noto Serif TC, serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "20px"
  numerals:
    fontFamily: "EB Garamond, serif"
    fontFeature: "\"lnum\" 1, \"tnum\" 1"
rounded:
  xs: "4px"
  sm: "6px"
  bar: "31px"
  full: "9999px"
spacing:
  stack: "8px"
  inline: "12px"
  card-y: "14px"
  card-x: "16px"
  card-roomy: "18px"
  gutter: "20px"
  section-top: "30px"
  section-bottom: "10px"
  touch: "44px"
  bar-clearance: "144px"
components:
  button-primary:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0 18px"
    height: "44px"
  button-quiet:
    textColor: "{colors.paper-white}"
    rounded: "{rounded.sm}"
    padding: "0 14px"
    height: "44px"
  button-quiet-pressed:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.sm}"
    padding: "14px 16px"
  card-thought:
    backgroundColor: "{colors.card}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.sm}"
    padding: "18px"
  field:
    backgroundColor: "{colors.card}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.sm}"
    padding: "10px 12px"
    height: "44px"
  bottom-bar:
    backgroundColor: "{colors.bar}"
    textColor: "{colors.paper-white}"
    typography: "{typography.label-nav}"
    rounded: "{rounded.bar}"
    height: "62px"
  capture-button:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    size: "46px"
  urgency-tag:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.ink}"
    typography: "{typography.label-tag}"
    rounded: "{rounded.xs}"
    padding: "0 6px"
---

# Design System: 個人助理

## Overview

**Creative North Star: "每日霧色封面的生活雜誌（The Daily Mist Cover）"**

整個 App 是一本每天換封面色的日系生活雜誌。打開時整個畫面是一片當天的霧色，左上角是斜體大字的英文星期當刊頭，下面一行大寫字距的日期；往下翻，先讀到「Thought of the day」，才是行程與最該先做的三件事。顏色本身就是日期：一週七種霧色，看一眼就知道今天星期幾。

材質是平的紙：同色系提亮一階的卡片、6px 小圓角、不加陰影；層次靠卡片色階與一條半透明白細線，不靠投影。文字一律白色，英文與數字用 EB Garamond（刊頭用真正的斜體，分段標題用正體），中文用思源宋體（明體），中文永遠保持正體。次要資訊靠縮小一號與斜體分層，不靠變淡。版面是單欄、手機優先，密度鬆，行高寬，像在讀雜誌而不是掃清單。

唯一會「表演」的地方是底部浮起的工具列：按右下角的白色＋，整條工具列從＋的位置展開成輸入框。其他動作只有短促的按壓回饋。明確拒絕的預設：白底清單加圓形勾選框的待辦 App 外觀。

**Key Characteristics:**
- 每天一種霧色封面（`[data-day]`，0 = 週日），所有表面色都從當天的 `--bg` 推導。
- 白字在卡片上至少 4.5:1；工具列上約 8:1。
- EB Garamond 斜體刊頭、正體分段標題，思源宋體正體中文，`font-synthesis-style: none`。
- 平面卡片：6px 圓角、沒有陰影；唯一的陰影屬於浮起的底部工具列。
- 項目前面是 7px 小圓點，圓點本身就是完成鈕；自己的行程用當天的暖色點。
- 一個招牌動畫（＋展開成輸入框），尊重減少動態效果設定。
- 所有觸控目標至少 44px。

## Colors

一週七種低彩度、偏暗的霧色當封面，配一顆當天的淺暖色點綴，其餘全部是由封面色推導出的白、墨與深一階的工具列色。

### Primary
當天的封面色寫在 `--bg`，由 `src/app/layout.tsx` 在畫面出現前依台北時間設定 `<html data-day>`，同時更新 `theme-color`。七個色都已調暗到白字放在「卡片色」上仍有 4.5:1 以上（實測 4.61–4.65:1），直接放在封面上約 6.1:1。
- **週日・霧灰藍 Slate Mist**（`mist-sunday`）：週日封面。
- **週一・霧藍 Harbor Mist**（`mist-monday`）：週一封面。
- **週二・灰綠 Sage Moss**（`mist-tuesday`）：週二封面，也是 `:root` 與 viewport `themeColor` 的預設值。
- **週三・灰紫 Wisteria Dusk**（`mist-wednesday`）：週三封面。
- **週四・灰玫瑰 Dried Rose**（`mist-thursday`）：週四封面。
- **週五・灰青 Celadon Slate**（`mist-friday`）：週五封面。
- **週六・鉛灰 Pewter**（`mist-saturday`）：週六封面。方向合約稱它「暖灰」，實際色值是中性、微冷的灰。

### Secondary
- **當日點綴色**（`dot-sunday` … `dot-saturday`，寫在 `--dot`）：杏桃、淺杏、稻黃、鮭粉、奶油黃、麥黃，週六是唯一的冷色（晴空藍）。只用在「我的行程」前面的 7px 實心圓點；在卡片上對比 3.1–3.7:1，符合非文字圖形 3:1。

### Neutral
- **紙白**（`paper-white`）：所有文字、細線的來源色；也是主要按鈕、＋按鈕、按下狀態、急件標籤的底色。
- **卡片色**（`card`）：當天封面 88% 混白。所有卡片、輸入框的底。
- **墨色**（`ink`）：當天封面 70% 混黑。只出現在白底上（主要按鈕文字、按下狀態、急件標籤、選取反白的文字），對白約 9.6:1。
- **工具列色**（`bar`）：當天封面 80% 混黑。底部浮起工具列的底，白字約 8.2–8.3:1。
- **細線**（`line`）：42% 白。分段標題底線、卡片內列與列的分隔、安靜按鈕與輸入框的邊框。

### Named Rules
**The Seven Covers Rule.** 表面色只有一個來源：當天的 `--bg`。卡片、墨、工具列都用 `color-mix()` 從它推導；新元件不得寫死任何表面色碼，否則換一天就會脫隊。

**The 4.5 Floor Rule.** 新增或調整封面色時，先確認白字在「88% 混白」的卡片色上至少 4.5:1，不夠就把封面調暗，而不是把字變粗或加底。卡片混白再多（例如 78%），白字就只剩約 3.7:1，不能放內文。

**The One Warm Dot Rule.** 點綴色只是一顆圓點，標出「這是我的行程」；不做文字色、不做底色、不做按鈕。

## Typography

**Display Font:** EB Garamond（`next/font` 打包，400/500/600，含斜體；fallback serif）
**Body Font:** 同一個字族堆疊 `EB Garamond, "Noto Serif TC", serif`：拉丁字與數字由 Garamond 出字，中文落到思源宋體（Google Fonts 依字分片載入，400/500/600）
**Numerals:** EB Garamond 等高、等寬數字（lining + tabular）

**Character:** 老派書籍感的 Garamond 斜體當刊頭與欄目名，配端正的明體中文內文；英文負責雜誌的語氣，中文負責內容的重量。

### Hierarchy
- **Display**（400 斜體，50px，行高 1，字距 -0.01em）：刊頭的英文星期或頁名（`Tuesday`、`Tasks`、`Settings`、登入頁的 `Good day`）。
- **Dateline**（500，13px，字距 0.3em，全大寫）：刊頭下方的日期或副標（`NOVEMBER 3`、`5 OPEN`），上距 8px。
- **Section**（500 正體，20px，字距 0.01em）：分段標題（`Thought of the day`、`Schedule`、`Done today`），下面一條細線，上距 30px、下距 10px。使用者要求分段標題不斜體、字大一點（2026-11-02）。
- **Title**（600，19px，行高 1.6）：思考內容的標題。
- **Question**（500，17px，行高 1.75）：思考題，左側一條 1px 白線引出。
- **Body reading**（400，15px，行高 1.9）：可讀的段落：思考內文、問候語、晚上摘要、空狀態說明。
- **Body**（400，16px，行高約 1.375）：列表項目、表單；輸入框固定 16px，避免 iPhone 自動放大。
- **Meta**（400 斜體，13.5px，字距 0.02em）：次要資訊、說明、切換（`Morning／Evening`）、文字連結。英文是 Garamond 斜體，中文保持正體。
- **Label nav**（400，12px，字距 0.16em，全大寫）：底部工具列的 `TODAY／TASKS／SETTINGS`，目前頁面用 1px 底線（下移 6px）標示。
- **Label tag**（400，12px，行高 20px）：急件小標籤。
- 按鈕文字 600；行動列的小按鈕 14px。

### Named Rules
**The True Italic Rule.** 斜體只來自 Garamond 自帶的斜體字形。`body` 設 `font-synthesis-style: none`，思源宋體沒有斜體，中文絕不被瀏覽器壓斜；需要「斜」的語氣時，中文靠字級與位置表達。

**The Size Not Fade Rule.** 次要文字用 13.5px 斜體 meta 與內文區分，不用降低透明度；白字永遠是全白，對比才守得住。

**The English Voice Rule.** 刊頭、分段標題、工具列標籤用英文 Garamond，像雜誌的欄目名；內容、按鈕、說明一律用繁體中文。

## Layout

單欄、置中、手機優先，電腦上是同一欄放在畫面中央，沒有任何斷點切換。
- 內容欄最寬 576px，左右 20px 留白；頂部 `max(20px, safe-area-inset-top)`，底部留 144px 給浮起的工具列。
- 刊頭上距 24px，左對齊；右側可放切換或動作，與刊頭底部對齊。
- 段落節奏：分段標題上 30px、下 10px；卡片內距 14px／16px（思考卡 18px）；卡片之間或堆疊元素 8px；同列元素間距 12px。
- 卡片內的列表以細線分隔，每列上下約 10–11px，加上 44px 的點擊範圍。
- 底部工具列固定在畫面底部：左右各 20px、底部 `max(18px, safe-area-inset-bottom)`、高 62px、最寬 536px（與內容欄同寬）。
- 登入頁：最寬 384px、左右 24px、垂直置中。

**The Thumb Rule.** 每個可點的東西至少 44×44px：完成圓點的點擊範圍、切換、文字連結、安靜按鈕、輸入框都一樣；主要動作（＋）固定在右下角拇指可及處。

## Elevation & Depth

平面系統。卡片、輸入框、行程列都沒有陰影，層次只來自兩件事：卡片比封面亮一階（88% 混白），以及 42% 白的細線。唯一的陰影屬於浮起的底部工具列，用來說明它懸在內容之上、內容會從它下面捲過。

### Shadow Vocabulary
- **工具列浮起**（`box-shadow: 0 10px 30px -8px rgb(0 0 0 / 0.45)`）：只用在底部工具列。

**The Flat Paper Rule.** 內容層一律平面：卡片不加陰影、不加漸層、不加模糊。需要分層時用卡片色或細線。

## Shapes

小而一致的圓角，加上兩種完整的圓。
- 6px：卡片、輸入框、主要與安靜按鈕、思考卡的回饋鈕。
- 4px：急件小標籤、焦點外框。
- 31px（膠囊）：底部工具列與展開的輸入框。
- 正圓：＋按鈕與送出鈕（46px）、7px 的項目圓點。
- 線條一律 1px：分段標題底線、列分隔、安靜按鈕與輸入框邊框、思考題左線。

**The Dot Rule.** 項目標記是 7px 小圓點，不是勾選框。待辦：未完成是白色實心點，完成後變成白框空心點並劃線。行程：自己的行程是當天點綴色的實心點，教室其他課是白框空心點。

## Components

### Buttons
- **Shape:** 小圓角（6px），最小高度 44px。
- **Primary（白底按鈕）：** 紙白底、墨色字、600 字重，左右 18px。用在儲存、確認、登入這類一個畫面只出現一次的主要動作。
- **Press / Disabled：** 按下縮到 0.97（120ms ease-out）；停用時透明度 0.45。
- **Quiet（安靜按鈕）：** 透明底、1px 細線框、白字，左右 14px。用在分類篩選、星期選擇、「今天做／已經做完／不做了」。按下狀態（`aria-pressed="true"`）翻成白底墨字。
- **Text action：** 思考卡下方的「有用／沒用／感想／和 Claude 聊」：14px 文字加 17px 線條圖示，沒有框；有用／沒用按下時翻成白底墨字 6px 圓角。
- **Focus：** 全站 `:focus-visible` 是 2px 白色外框，外移 3px，4px 圓角。

### Chips
- **Style:** 篩選列沿用安靜按鈕（14px 字），橫向捲動、隱藏捲軸。
- **State:** 選中時白底墨字；狀態篩選（未完成／已完成／不做了）改用文字加 1px 底線標示目前選項。

### Cards / Containers
- **Corner Style:** 6px。
- **Background:** 卡片色（當天封面 88% 混白）。
- **Shadow Strategy:** 無，見 Elevation & Depth。
- **Border:** 無外框；內部列表用細線分隔。
- **Internal Padding:** 14px／16px；放列表時上下改 4px，讓每列自己撐出空間；思考卡 18px。

### Inputs / Fields
- **Style:** 卡片色底、1px 細線框、6px 圓角、內距 10px／12px、最小高度 44px、字級固定 16px。
- **Placeholder：** 90% 白斜體（中文仍為正體）。
- **Focus：** 邊框變全白，不加外光。
- **Date / Time：** `color-scheme: dark`，讓原生選擇器跟深色背景一致。

### Navigation
- **底部工具列：** 工具列色底、31px 膠囊、高 62px、浮起陰影。左邊三個 12px 大寫字距的 Garamond 標籤平分寬度，目前頁面加 1px 底線；右邊是 46px 白色圓形＋（墨色圖示）。
- **頁內切換：** 刊頭右側的 `Morning／Evening` 用 meta 字體，目前選項加底線。

### Capture Bar（招牌元件）
按＋後，整條工具列在原位變成輸入框：用 `clip-path` 從右側＋的 54px 圓形展開到整條膠囊，透明度 0.6→1，460ms，`cubic-bezier(0.16, 1, 0.3, 1)`。輸入框自動取得焦點；有文字時右側是白色圓形送出鈕（向上箭頭），沒文字時是取消（X）。送出後 placeholder 改成「記下了，下次整理時會排進去」，1.1 秒後自動收回成工具列。開啟「減少動態效果」時，所有動畫與轉場時間歸零。

### Todo Row
左側 7px 圓點就是完成鈕（點擊範圍 44px，向左凸出對齊卡片邊）；標題 16px，右側可放急件標籤與 Garamond 等寬數字的開始時間；截止日或理由放在下一行的 meta。完成或不做了的項目加 1px 刪除線。

### Urgency Tag
只標「急」：白底墨字、12px、4px 圓角、左右 6px。中、緩不標示，完成或不做的待辦也不標。

### Masthead
左對齊的斜體 Display 標題加一行 Dateline，右側可放切換或動作，三個主頁面與登入頁共用。

**The One Flourish Rule.** 招牌動畫只有一個：＋展開成輸入框。另外，使用者要求「點選切換要有動畫」（2026-11-02），所以切換有一套固定的動態：分頁與早上／晚上的底線滑到選中那格（`.slide-indicator`，380ms），切換後的內容輕輕浮上來（`.view-enter`，380ms，從 15% 不透明、下移 10px 開始），兩者都用 `cubic-bezier(0.16, 1, 0.3, 1)`。其他動態只限於按壓縮放（0.95–0.97）、收合箭頭旋轉、以及換日時封面色 600ms 的背景淡換；新功能不另外加入場、捲動或裝飾性動畫，切換一律沿用這兩個 class。

## Do's and Don'ts

### Do:
- **Do** 從當天的 `--bg` 推導所有表面色（卡片 88% 混白、墨 70% 混黑、工具列 80% 混黑），新元件用 `bg-card`、`text-ink`、`bg-bar`、`border-line` 這些語意色。
- **Do** 新增封面色時先驗證白字在卡片色上 ≥ 4.5:1，不夠就調暗封面色，並同步更新 `globals.css` 的 `[data-day]` 與 `layout.tsx` 的 `DAY_COLORS`。
- **Do** 用 13.5px 斜體 meta 表達次要資訊，文字顏色保持全白。
- **Do** 刊頭用 EB Garamond 斜體英文，分段標題用 EB Garamond 正體；中文內容用思源宋體正體。
- **Do** 讓每個可點元素至少 44×44px，輸入框字級保持 16px。
- **Do** 元素層級的預設樣式寫在 `@layer base`，元件類別寫在 `@layer components`，讓 Tailwind 工具類能覆蓋。
- **Do** 數字（時間、日期、筆數）用 Garamond 等高等寬數字。

### Don't:
- **Don't** 給卡片、輸入框或列表加陰影；陰影只屬於浮起的底部工具列。
- **Don't** 用透明度把次要文字變淡；透明度只留給停用狀態、placeholder 與細線。
- **Don't** 讓中文變成斜體，或拿掉 `font-synthesis-style: none`。
- **Don't** 用方形或圓形勾選框取代 7px 圓點；不要做成白底清單的待辦 App。
- **Don't** 用紅色或警示色標示急件或拖延；急件只用白底墨字的小標籤。
- **Don't** 把點綴色用在文字、底色或按鈕上。
- **Don't** 把卡片調得比現在更淺又放白色內文（78% 混白時只有約 3.7:1，低於 4.5:1）。
- **Don't** 加第二個招牌動畫或裝飾性動態；所有動態都要在減少動態效果設定下歸零。
