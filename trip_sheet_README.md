旅程協作 Google Sheets 設計（Human + AI Friendly）

簡介
- 目標：建立一套同時對人類友善、又方便多個 AI 讀寫/更新的 Google Sheets 行程系統。設計要點是把「人類易讀」視圖與「AI 可解析」資料分離，並提供衝突處理、變更紀錄與同步流程（到 Google Calendar / 匯出 CSV）。

高階決策（我已代為選擇，基於最大努力、user-friendly）
- 時區：統一用旅遊地當地時間（Seoul KST）。所有時間欄位同 stored timestamps 都用 ISO8601（YYYY-MM-DDTHH:MM:SS+09:00）或分開 date + time + timezone（sheet 用分開欄，AI 用 ISO 格式欄）。
- Sheet 架構（三層）:
  1) Human_View：人類閱讀優先的日程表（合併顯示、顏色、當日摘要、總花費）
  2) AI_Data：規範化、每筆一行的機器友好表格（主鍵、ISO 時間、結構化欄位、metadata）
  3) Meta_Log：變更紀錄（append-only），記錄所有寫入/刪除/更新行為、修改者、時間、舊值、新值
- 主鍵：用短 UUID（例如 item-20260314-0001）或自增 id 結合日期（方便人看）。AI 在更新時必須帶主鍵與 last_updated_at（樂觀鎖）。
- 衝突策略（樂觀鎖 + append log）:
  - AI/人類在寫入前讀取 target row 的 last_updated_at；若 mismatch（在此之後已被更改），寫入失敗並回傳衝突訊息，寫入者應先 fetch 最新資料、merge、再寫入。
  - 所有成功寫入都 append 到 Meta_Log（包含前 value 與後 value），以便回滾。
- 權限與自動化：如需 AI 自動寫入，建議建立一個 service-account 或 robot Google 帳號並用 Google Sheets API 寫入；若不想設定，採用 CSV 匯入流程（AI 產出 CSV ，人手上傳）。
- 更新頻率建議：實務上限制為「每筆項目每 5 分鐘最多一次寫入」或「每次交互不超過 5 筆修改」。README 會建議守則。

AI_Data 欄位 schema（machine-friendly，必有）
- id (string) — 主鍵
- date (YYYY-MM-DD)
- start_time (HH:MM 24h)
- end_time (HH:MM 24h)
- start_iso (YYYY-MM-DDTHH:MM:SS+09:00) — optional, AI preferred
- end_iso (YYYY-MM-DDTHH:MM:SS+09:00)
- timezone (Asia/Seoul)
- title (string)
- type (flight | transport | meal | activity | shopping | rest | lodging | other)
- location_name (string)
- address (string)
- lat (float) — optional
- lng (float) — optional
- from_place (string) — for transfers
- to_place (string)
- transport_mode (subway | bus | taxi | walk | airport_bus | arex | car)
- est_duration_min (integer)
- est_cost_hkd (number)
- assigned_to (string) — person id or ai-id
- status (planned | tentative | confirmed | done | cancelled)
- reservation_required (yes | no)
- reservation_status (none | requested | confirmed | declined)
- links (string) — JSON array or pipe-separated links
- notes (string)
- last_updated_by (string)
- last_updated_at (ISO)
- version (integer)

Human_View 欄位（為人類而設，友善格式）
- Date | Time | Title | Where | Notes | Transport | Cost est | Reservation | Status
- 顏色標籤：Flight(深灰)、Meal(橙)、Shopping(藍)、Activity(綠)、Rest(灰)
- 每日頂部顯示：當日總預估成本、主要集合時間、航班時間

Meta_Log 欄位
- log_id | timestamp | actor | action (create/update/delete) | target_id | field_changed | old_value | new_value | raw_payload

操作規範（AI 寫入守則，供其他 chatbot 使用）
1) 讀取流程：先 fetch AI_Data row by id。若要修改，fetch 並帶 last_updated_at。AI 不可直接 overwrite without check。
2) 寫入流程：AI 要提交 JSON payload 含 id、fields_to_update、last_updated_at（從 fetch 拿到）。API or script 檢查 last_updated_at 相符才 commit。若不符，回 409 conflict 並把最新 row 返回。
3) 新增項目：生成 id，version = 1，寫入 AI_Data 並 append Meta_Log。
4) 刪除項目：標記 status=cancelled，並 append Meta_Log（避免真刪以保紀錄）。
5) 批次更新：一次最多 5 筆，如需多筆，分批提交並在 Meta_Log 標記 batch_id。

同步到 Google Calendar（推薦）
- 欄位映射：AI_Data 的 start_iso/end_iso → Calendar event start/end；title → summary；links/notes → description；location_name/address → location
- 可建立一個專用 Calendar "Trip: Korea Mar14-19"，將重要事件（航班、餐廳預約）同步為事件並設定提醒（T-3h for flight check-in, T-1h for meetups）
- 同步可以透過 Google Apps Script 或外部 script（Python/Node）使用 service account

衝突處理示例流程（AI）
- AI 想把 item-20260314-0003 的 status 改為 confirmed：
  1) GET row → returns last_updated_at = 2026-02-24T10:00:00+09:00
  2) AI 提交 PATCH payload 包含 last_updated_at = 經 GET 得到的值
  3) Server checks：若表中 last_updated_at == payload.last_updated_at → apply changes、increment version、update last_updated_at to now，append Meta_Log
  4) 若 mismatch → return 409 + current row data

備份與版本
- 建議每天自動備份整張表（CSV）到 Google Drive backup 資料夾（或手動 on-demand）。README 會包含簡單 Google Apps Script 範例。

示例工作流（多人 + 多 AI 協作）
1) Human 在 Human_View 新增「想去」註記（不寫 AI_Data）
2) AI 定期 scan Human_View（或由人按鈕觸發），將新項目 normalize 後寫入 AI_Data（create row）並在 Human_View 顯示具體時間建議
3) 如多人編輯同一項：AI 在寫入前做 fetch/compare；如 conflict 發生，append to Meta_Log 並 send notification to human（或在 Human_View 顯示需要手動合併）

交付物（我會放入 workspace）
- trip_sheet_README.md（本說明）
- trip_sheet_template.csv（AI_Data 範本含欄位 header 與 sample row）
- human_view_template.csv（Human_View 範本）
- meta_log_template.csv（Meta_Log 範本）
- example_scripts/README.md（說明如何以 CSV 方式匯入/匯出，以及簡單 Python 範例 code 範本，需你授權 Google API 才能實作自動化）

下一步（我會做）
- 生成 CSV 範本並把你現有行程 + 餐廳候補填入 AI_Data 範本（我會放在 workspace，供你檢視並上傳到 Google Sheets）
- 若你要，我可以同時產生 human_view_template.csv

最後一個問題（之後盡量少問）： README 要用廣東話定英文？（我會做雙語簡短版 if 你唔介意）

如果冇問題，我就會把 CSV 範本寫到 workspace 並回報檔案位置。