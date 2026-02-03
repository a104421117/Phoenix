"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const fs = require("fs");
const path = require("path");

// 解析 CSV
function parseCSV(content) {
    const lines = content.split("\n").filter((line) => line.trim());
    const results = [];
    
    // 跳過標題行
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // 處理可能有引號的欄位
        const values = [];
        let current = "";
        let inQuotes = false;

        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === "," && !inQuotes) {
                values.push(current.trim());
                current = "";
            } else {
                current += char;
            }
        }
        values.push(current.trim());

        if (values.length >= 3) {
            results.push({
                name: values[0].replace(/^"|"$/g, ""),
                x: parseFloat(values[1]),
                y: parseFloat(values[2]),
                width: values[3] ? parseFloat(values[3]) : undefined,
                height: values[4] ? parseFloat(values[4]) : undefined,
            });
        }
    }

    return results;
}

// 遞迴搜尋節點
async function findNodesByName(parentUuid, targetNames, results) {
    const children = await Editor.Message.request("scene", "query-node-tree", parentUuid);
    
    if (!children || !children.children) return;

    for (const child of children.children) {
        if (targetNames.has(child.name)) {
            if (!results[child.name]) {
                results[child.name] = [];
            }
            results[child.name].push(child.uuid);
        }
        // 遞迴搜尋子節點
        await findNodesByName(child.uuid, targetNames, results);
    }
}

// 設定節點座標
async function setNodePosition(uuid, x, y) {
    try {
        await Editor.Message.request("scene", "set-property", {
            uuid: uuid,
            path: "position",
            dump: {
                type: "cc.Vec3",
                value: { x: x, y: y, z: 0 }
            }
        });
        return true;
    } catch (e) {
        console.error("設定座標失敗:", e);
        return false;
    }
}

// 主要匯入函數
async function doImport(csvPath, options) {
    // 讀取 CSV
    let content;
    try {
        // 處理 BOM
        const buffer = fs.readFileSync(csvPath);
        content = buffer.toString("utf8").replace(/^\uFEFF/, "");
    } catch (e) {
        return { success: false, message: "無法讀取檔案: " + e.message };
    }

    const positions = parseCSV(content);
    if (positions.length === 0) {
        return { success: false, message: "CSV 檔案中沒有有效的座標資料" };
    }

    // 獲取場景根節點
    const sceneUuid = await Editor.Message.request("scene", "query-node-tree", "");
    if (!sceneUuid) {
        return { success: false, message: "請先打開一個場景" };
    }

    // 收集所有目標名稱
    const targetNames = new Set(positions.map((p) => p.name));
    const foundNodes = {};

    // 搜尋節點
    await findNodesByName("", targetNames, foundNodes);

    // 套用座標
    let updated = 0;
    let notFound = [];
    let duplicates = [];

    for (const pos of positions) {
        const nodes = foundNodes[pos.name];
        
        if (!nodes || nodes.length === 0) {
            notFound.push(pos.name);
            continue;
        }

        if (nodes.length > 1 && !options.updateAll) {
            duplicates.push(pos.name);
            // 只更新第一個
            await setNodePosition(nodes[0], pos.x, pos.y);
            updated++;
        } else {
            // 更新所有同名節點
            for (const uuid of nodes) {
                await setNodePosition(uuid, pos.x, pos.y);
                updated++;
            }
        }
    }

    // 儲存場景
    if (options.autoSave && updated > 0) {
        await Editor.Message.request("scene", "save-scene");
    }

    return {
        success: true,
        updated: updated,
        notFound: notFound,
        duplicates: duplicates,
        total: positions.length
    };
}

module.exports = {
    load() {
        console.log("CSV Position Importer 已載入");
    },

    unload() {
        console.log("CSV Position Importer 已卸載");
    },

    methods: {
        async openPanel() {
            // 使用系統檔案對話框選擇 CSV
            const result = await Editor.Dialog.select({
                title: "選擇 CSV 座標檔案",
                path: "",
                type: "file",
                filters: [
                    { name: "CSV 檔案", extensions: ["csv"] },
                    { name: "所有檔案", extensions: ["*"] }
                ]
            });

            if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
                return;
            }

            const csvPath = result.filePaths[0];

            // 確認對話框
            const confirm = await Editor.Dialog.info("匯入 CSV 座標", {
                detail: `將從以下檔案匯入座標：\n${csvPath}\n\n節點將根據「名稱」匹配。\n\n確定要繼續嗎？`,
                buttons: ["取消", "匯入"],
                default: 1,
                cancel: 0
            });

            if (confirm.response === 0) return;

            // 執行匯入
            const importResult = await doImport(csvPath, {
                updateAll: false,
                autoSave: false
            });

            // 顯示結果
            if (!importResult.success) {
                await Editor.Dialog.error("匯入失敗", {
                    detail: importResult.message
                });
                return;
            }

            let detail = `成功更新 ${importResult.updated} 個節點`;
            
            if (importResult.notFound.length > 0) {
                detail += `\n\n以下節點在場景中找不到（共 ${importResult.notFound.length} 個）：\n`;
                detail += importResult.notFound.slice(0, 10).join(", ");
                if (importResult.notFound.length > 10) {
                    detail += ` ...等`;
                }
            }

            if (importResult.duplicates.length > 0) {
                detail += `\n\n以下名稱有重複節點（只更新了第一個）：\n`;
                detail += importResult.duplicates.join(", ");
            }

            await Editor.Dialog.info("匯入完成", {
                detail: detail,
                buttons: ["確定"]
            });
        },

        async importCSV(csvPath, options = {}) {
            return await doImport(csvPath, options);
        }
    }
};
