# GitHub Actions WS Secrets 設定說明

## 目的
這份文件給 repository owner 使用，用來設定 CI/CD 在 build 時自動帶入不同環境的 WebSocket URL。

## 需要建立的 Secrets
請到 `Settings -> Secrets and variables -> Actions -> New repository secret`，建立以下三個值：

| Secret 名稱 | 用途 | 範例值 |
| --- | --- | --- |
| `GAME_WS_URL_DEV` | `dev-*` tag 使用 | `wss://dev.example.com/connect` |
| `GAME_WS_URL_STAGE` | `stage-*` tag 使用 | `wss://stage.example.com/connect` |
| `GAME_WS_URL_PROD` | `prod-*` tag 使用 | `wss://prod.example.com/connect` |

## Tag 與環境對應規則
Workflow 會根據 tag 前綴自動挑選對應的 secret：

| Tag 格式 | 對應環境 | 對應 Secret |
| --- | --- | --- |
| `dev-x.x.x` | `dev` | `GAME_WS_URL_DEV` |
| `stage-x.x.x` | `stage` | `GAME_WS_URL_STAGE` |
| `prod-x.x.x` | `prod` | `GAME_WS_URL_PROD` |

例如：
- `dev-1.2.3`
- `stage-1.2.3`
- `prod-1.2.3`

## 目前觸發狀態
`build.yml` 目前只啟用 `dev-*` 自動觸發。  
`stage-*`、`prod-*` 目前在檔案中是註解狀態，若要啟用請打開對應 tag 設定。

## 觸發與驗證
1. 建立並 push 一個符合格式的 tag。
2. 到 `Actions` 頁面確認 workflow 開始執行。
3. 在 build log 看到 `Resolved DEPLOY_ENV=...`。
4. Artifact 中確認 `build/web-mobile/game-config.json` 存在，且 `wsUrl` 為對應環境 URL。

## 常見錯誤
- `Invalid tag format`：tag 不符合 `dev/stage/prod-x.x.x`。
- `WS URL ... is empty`：對應的 secret 尚未設定或值為空。
- 沒有觸發 workflow：tag 前綴未啟用或 push 的不是 tag。
