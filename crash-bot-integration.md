# Crash Bot 串接流程

## 連線流程

```
WebSocket連線 → lobby.list → room.list → room.join → game.init → game.balance → 進入遊戲循環
```

### 1. WebSocket 連線
```
ws://localhost:20001/connect?token={token}
```

### 2. 取得大廳列表
```json
// 送出
{ "op": "lobby.list", "data": { "gameCode": "phoenix", "currency": "TWD" } }

// 回傳 (type: "lobby.list")
{ "status": "ok", "type": "lobby.list", "data": { "lobbies": [{ "lobbyId": "..." }] } }
```

### 3. 取得房間列表
```json
// 送出
{ "op": "room.list", "data": { "lobbyId": "{lobbyId}", "status": "open", "limit": 50 } }

// 回傳 (type: "room.list")
{ "status": "ok", "type": "room.list", "data": { "rooms": [{ "roomId": "..." }] } }
```

### 4. 加入房間
```json
// 送出
{ "op": "room.join", "data": { "roomId": "{roomId}" } }

// 回傳 (type: "room.joined")
{ "status": "ok", "type": "room.joined", "data": { "roomId": "..." } }
```

### 5. 遊戲初始化
```json
// 送出
{ "op": "game.init", "data": { "roomId": "{roomId}" } }

// 回傳 (type: "game.init")
{ "status": "ok", "type": "game.init", "data": { "roomId": "...", "minBet": 20, ... } }
```

### 6. 取得餘額（必須在 game.init 回傳後才能呼叫）
```json
// 送出
{ "op": "game.balance", "data": { "roomId": "{roomId}" } }

// 回傳 (type: "game.balance")
{ "status": "ok", "type": "game.balance", "data": { "balance": 10000, ... } }
```

> **OpAccess 規則**：`game.init` → `game.balance` → `game.action`，每一步都要等回傳後才能進行下一步。

---

## 遊戲循環

```
Betting（下注階段）→ Running（飛行階段）→ Crashed（爆炸）→ 下一輪 Betting
```

### 狀態廣播 (type: "room.round.state")
```json
// Betting 階段
{ "type": "room.round.state", "data": { "state": "Betting", "bettingCountdown": 15 } }

// Running 階段
{ "type": "room.round.state", "data": { "state": "Running", "currentMultiplier": 0.75 } }

// Crashed 階段
{ "type": "room.round.state", "data": { "state": "Crashed", "crashPoint": 1.23 } }
```

> **倍率注意**：Server 的 `currentMultiplier` 從 **0** 開始，畫面顯示倍率 = `1 + currentMultiplier`。
> 例如 server 回傳 `currentMultiplier: 0.75` = 畫面上 **1.75x**。

---

## 遊戲操作

### 下注 (Betting 階段送出)
```json
// 送出
{
  "op": "game.action",
  "data": {
    "roomId": "{roomId}",
    "method": "crash.bet",
    "payload": { "betUnits": 20, "requestId": "b-{timestamp}" }
  }
}

// 回傳 (type: "game.action")
{
  "status": "ok", "type": "game.action",
  "data": {
    "method": "crash.bet",
    "payload": {
      "betId": "{roundId}:{playerId}:{seq}",
      "roundId": "...",
      "betAmount": 20,
      "autoCashoutMultiplier": null
    }
  }
}
```

### 兌現 (Running 階段送出)
```json
// 送出
{
  "op": "game.action",
  "data": {
    "roomId": "{roomId}",
    "method": "crash.cashout",
    "payload": { "betId": "{betId}", "requestId": "co-{timestamp}" }
  }
}
```

### 兌現成功廣播 (type: "room.cashout.done")
```json
{
  "type": "room.cashout.done",
  "data": {
    "roomId": "...",
    "roundId": "...",
    "betId": "...",
    "playerId": "...",
    "cashoutMultiplier": 0.7897,
    "payoutGross": 15.794,
    "serviceFee": 0.7897,
    "payoutNet": 15.0043,
    "requestId": "co-..."
  }
}
```

> **cashoutMultiplier 是利潤倍率**（server 內部倍率，從 0 開始），不是畫面倍率。
> 畫面倍率 = `1 + cashoutMultiplier` = 1.7897x。
>
> **payoutNet 是淨利潤**（不含本金）：
> - `payoutGross = betAmount × cashoutMultiplier`（毛利）
> - `serviceFee = payoutGross × feeRate`（手續費，目前 5%）
> - `payoutNet = payoutGross - serviceFee`（淨利）
>
> 玩家實際拿回 = **本金 + payoutNet**

---

## RTP 計算

```
RTP = totalReturned / totalWagered × 100%

totalWagered = 每局下注金額加總
totalReturned = 贏的局數 × 本金 + 所有 payoutNet 加總
```

---

## 錯誤回傳
```json
{ "status": "error", "code": "not_joined_room", "message": "Player has not joined the room" }
```

常見錯誤碼：
- `not_joined_room` — 玩家未加入房間（可能被 offline cleanup 移除）
- `bet_not_pending` — 重複兌現或下注狀態不對
- `round_not_betting` — 非下注階段嘗試下注

---

## DB 設定：game_connection_policies

| 欄位 | 說明 | 可選值 |
|------|------|--------|
| `game_code` | 遊戲代碼 | `phoenix` |
| `disconnect_mode` | 斷線處理 | `keep`（保留）/ `leave`（離開） |
| `offline_cleanup_mode` | 離線清理 | `none`（不清理）/ `round_end`（回合結束清理） |

> Bot 測試時需設為 `disconnect_mode = 'keep'`, `offline_cleanup_mode = 'none'`，
> 否則每回合結束會被 `RoomOfflineCleanupProcessor` 踢出房間。
