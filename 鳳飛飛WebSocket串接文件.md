# 鳳飛飛 WebSocket 串接文件

## 連線方式

```
ws://localhost:7070/ws/fengfeifei@$_$@{玩家名稱}?table={桌號}
```

**範例：**
```
ws://localhost:7070/ws/fengfeifei@$_$@小明?table=A
```

連線成功後，伺服器會自動回傳 `Login` 訊息。

---

## 訊息格式

所有訊息均為 JSON，統一使用 `cmd` 欄位標識指令：

```json
{ "cmd": "指令名稱", "data": { ... } }
```

---

## 遊戲流程

```
連線 → Login
        ↓
   BettingStart（10秒倒數）
        ↓
   玩家發送 Bet → 收到 BetOK
        ↓
   RoundStart（停止下注，開始飛行）
        ↓
   Flying（每100ms更新倍數）
        ↓
   玩家發送 Cashout → 收到 Win
        ↓
   Explode（爆炸）→ 未取出的注收到 Lose
        ↓
   等待5秒 → 回到 BettingStart
```

---

## 伺服器 → 客戶端

### 1. Login（登入成功）

連線後自動發送。

```json
{
  "cmd": "Login",
  "data": {
    "id": "player_abc123",
    "name": "小明",
    "balance": 50000,
    "betOptions": [100, 500, 1000, 5000, 10000],
    "maxBetCount": 5,
    "history": [
      { "roundId": 100, "multiplier": 2.35, "timestamp": 1706500000000 },
      { "roundId": 99,  "multiplier": 1.12, "timestamp": 1706499970000 }
    ]
  }
}
```

| 欄位 | 類型 | 說明 |
|------|------|------|
| `id` | string | 玩家唯一ID |
| `name` | string | 玩家名稱 |
| `balance` | number | 目前餘額 |
| `betOptions` | number[] | 可選押注金額列表 |
| `maxBetCount` | number | 每局最多可下注筆數 |
| `history` | array | 近100局歷史紀錄 |
| `history[].roundId` | number | 局號 |
| `history[].multiplier` | number | 該局爆炸倍數 |
| `history[].timestamp` | number | 時間戳(毫秒) |

---

### 2. BettingStart（下注倒數開始）

每局開始時廣播，進入押注階段。玩家中途登入時也會收到此訊息，`seconds` 為剩餘秒數。

```json
{
  "cmd": "BettingStart",
  "data": {
    "seconds": 10
  }
}
```

| 欄位 | 類型 | 說明 |
|------|------|------|
| `seconds` | number | 剩餘倒數秒數（新局開始為10秒，中途登入為剩餘秒數） |

---

### 3. BetOK（下注成功）

玩家下注成功後回傳。

```json
{
  "cmd": "BetOK",
  "data": {
    "index": 0
  }
}
```

| 欄位 | 類型 | 說明 |
|------|------|------|
| `index` | number | 該筆下注的索引（0起始） |

---

### 4. RoundStart（回合開始）

下注時間結束，停止接受下注，飛行即將開始。

```json
{
  "cmd": "RoundStart"
}
```

無 `data` 欄位。

---

### 5. Flying（飛行中同步）

飛行階段每 100ms 廣播一次。

```json
{
  "cmd": "Flying",
  "data": {
    "serverTime": 1706500012.345,
    "elapsed": 3.200,
    "multiplier": 1.21,
    "rank": [
      {
        "id": "player_001",
        "name": "小明",
        "avatar": "",
        "totalBet": 15000,
        "bets": [
          { "amount": 10000, "cashedOut": false, "cashoutMultiplier": 0, "profit": 0 },
          { "amount": 5000,  "cashedOut": true,  "cashoutMultiplier": 1.5, "profit": 2125 }
        ]
      }
    ]
  }
}
```

| 欄位 | 類型 | 說明 |
|------|------|------|
| `serverTime` | number | 伺服器時間（秒，含小數） |
| `elapsed` | number | 飛行經過時間（秒） |
| `multiplier` | number | 目前倍數 |
| `rank` | array | 前6名玩家排行（依投注額降序） |
| `rank[].id` | string | 玩家ID |
| `rank[].name` | string | 玩家名稱 |
| `rank[].avatar` | string | 玩家頭像 |
| `rank[].totalBet` | number | 該局總投注額 |
| `rank[].bets` | array | 該玩家各筆投注詳情 |
| `rank[].bets[].amount` | number | 投注金額 |
| `rank[].bets[].cashedOut` | boolean | 是否已取出 |
| `rank[].bets[].cashoutMultiplier` | number | 取出時的倍數（未取出為0） |
| `rank[].bets[].profit` | number | 該筆損益（未結算為0） |

---

### 6. Win（取出成功）

玩家手動取出或自動取出時，僅發送給該玩家。

```json
{
  "cmd": "Win",
  "data": {
    "index": 0,
    "amount": 1000,
    "multiplier": 2.50,
    "win": 2375
  }
}
```

| 欄位 | 類型 | 說明 |
|------|------|------|
| `index` | number | 該筆下注索引 |
| `amount` | number | 原始投注金額 |
| `multiplier` | number | 取出時倍數 |
| `win` | number | 實際獲得金額（已扣5%服務費） |

> **服務費計算：** `win = floor(amount × multiplier × 0.95)`

---

### 7. Explode（爆炸）

飛行結束，廣播給所有玩家。

```json
{
  "cmd": "Explode",
  "data": {
    "multiplier": 2.35
  }
}
```

| 欄位 | 類型 | 說明 |
|------|------|------|
| `multiplier` | number | 爆炸時的倍數 |

---

### 8. Lose（未取出）

爆炸後，對每筆未取出的投注發送給對應玩家。

```json
{
  "cmd": "Lose",
  "data": {
    "index": 0
  }
}
```

| 欄位 | 類型 | 說明 |
|------|------|------|
| `index` | number | 虧損的下注索引 |

---

## 客戶端 → 伺服器

### 1. Bet（下注）

在 `BettingStart` 到 `RoundStart` 期間發送。每局最多下注 **5 筆**。

```json
{
  "cmd": "Bet",
  "data": {
    "index": 0,
    "amount": 1000
  }
}
```

| 欄位 | 類型 | 說明 |
|------|------|------|
| `index` | number | 下注索引（0起始，前端自行遞增） |
| `amount` | number | 下注金額（最小10，最大100000） |

成功後收到 `BetOK`，失敗無回應。

---

### 2. Cashout（取出）

在 `Flying` 階段發送，對指定索引的投注進行取出。

```json
{
  "cmd": "Cashout",
  "data": {
    "index": 0
  }
}
```

| 欄位 | 類型 | 說明 |
|------|------|------|
| `index` | number | 要取出的下注索引 |

成功後收到 `Win`，失敗無回應。

---

## 遊戲規則

| 項目 | 數值 |
|------|------|
| 押注倒數 | 10 秒 |
| 結算等待 | 5 秒 |
| 最小押注 | 10 |
| 最大押注 | 100,000 |
| 每局最多押注筆數 | 5 |
| 服務費率 | 5% |
| 倍數更新頻率 | 100ms |
| 倍數公式 | `e^(0.06 × t)` （t為秒數） |
| 排行顯示 | 前6名（依投注額排序） |
| 歷史紀錄 | 最多100局 |
