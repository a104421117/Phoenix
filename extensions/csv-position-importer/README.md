# CSV Position Importer - Cocos Creator 3.x 擴展

將 Photoshop 匯出的 CSV 座標直接匯入 Cocos Creator 場景。

## 安裝方式

1. 將 `csv-position-importer` 資料夾複製到你的專案目錄下的 `extensions` 資料夾
   ```
   你的專案/
   ├── assets/
   ├── extensions/
   │   └── csv-position-importer/   <-- 放這裡
   │       ├── package.json
   │       └── dist/
   │           └── main.js
   ```

2. 在 Cocos Creator 中，點選選單 **擴展 → 擴展管理器**

3. 找到 `csv-position-importer`，點擊 **啟用** 或 **重新載入**

## 使用方式

1. 打開你要編輯的場景

2. 點選選單 **工具 → CSV 座標匯入 → 匯入 CSV 座標...**

3. 選擇 PS 腳本輸出的 CSV 檔案

4. 擴展會自動根據「圖層名稱」匹配場景中的「節點名稱」，並更新座標

## CSV 格式

CSV 檔案格式（由 PS 腳本自動產生）：

```csv
圖層名稱,Cocos_X,Cocos_Y,寬度,高度,PS_X,PS_Y
btn_start,0,-100,200,80,540,392
btn_settings,0,-200,200,80,540,492
```

## 匹配規則

- 根據 CSV 的「圖層名稱」欄位匹配場景中的節點名稱
- 會遞迴搜尋整個場景樹
- 如果找到多個同名節點，只會更新第一個
- 找不到的節點會在結果中列出

## 注意事項

- 匯入前請確保場景已打開
- 建議匯入後手動儲存場景確認結果
- 節點名稱必須與 PS 圖層名稱完全一致（區分大小寫）

## 搭配使用

此擴展搭配 `PS_to_CocosCreator_v4.jsx` Photoshop 腳本使用效果最佳。

工作流程：
1. 在 Photoshop 中設計 UI 佈局
2. 執行 PS 腳本匯出 CSV
3. 在 Cocos Creator 中建立對應名稱的節點
4. 使用此擴展匯入座標
