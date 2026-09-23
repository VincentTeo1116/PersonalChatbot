/**
 * Bound Apps Script for the Portfolio KB Google Sheet.
 *
 * Setup:
 *   1. In the Google Sheet, go to Extensions > Apps Script.
 *   2. Delete the default Code.gs contents and paste this file in.
 *   3. Project Settings (gear icon) > Script Properties, add:
 *        WEBHOOK_URL = https://<your-deployed-backend>/api/admin/sync-kb
 *        SYNC_SECRET = <same value as SYNC_WEBHOOK_SECRET in the backend .env>
 *   4. Reload the sheet. A "Portfolio KB" menu appears.
 *   5. Run "Portfolio KB > Enable auto-sync on edit" once (grants permissions
 *      and installs the onEdit trigger). From then on, every edit to the KB
 *      sheet tab is pushed to Pinecone automatically within a few seconds.
 *   6. Use "Portfolio KB > Sync now" any time to force a manual sync.
 *
 * Expected sheet tab name: "KB"
 * Expected header row (row 1): category | question | answer | tags | is_active
 */

const SHEET_NAME = "KB";
const REQUIRED_HEADERS = ["category", "question", "answer", "tags", "is_active"];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Portfolio KB")
    .addItem("Sync now", "syncNow")
    .addItem("Enable auto-sync on edit", "enableAutoSync")
    .addItem("Disable auto-sync on edit", "disableAutoSync")
    .addToUi();
}

function enableAutoSync() {
  disableAutoSync(); // avoid duplicate triggers
  ScriptApp.newTrigger("onEditInstallable")
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onEdit()
    .create();
  SpreadsheetApp.getUi().alert("Auto-sync enabled. Edits to the KB tab now push to the chatbot automatically.");
}

function disableAutoSync() {
  ScriptApp.getProjectTriggers().forEach((t) => {
    if (t.getHandlerFunction() === "onEditInstallable") ScriptApp.deleteTrigger(t);
  });
}

function onEditInstallable(e) {
  const sheet = e && e.range ? e.range.getSheet() : null;
  if (!sheet || sheet.getName() !== SHEET_NAME) return;
  syncNow();
}

function syncNow() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
  if (!sheet) {
    SpreadsheetApp.getUi().alert(`Sheet tab "${SHEET_NAME}" not found.`);
    return;
  }

  const props = PropertiesService.getScriptProperties();
  const webhookUrl = props.getProperty("WEBHOOK_URL");
  const syncSecret = props.getProperty("SYNC_SECRET");
  if (!webhookUrl || !syncSecret) {
    SpreadsheetApp.getUi().alert("Set WEBHOOK_URL and SYNC_SECRET in Project Settings > Script Properties first.");
    return;
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0].map((h) => String(h).trim().toLowerCase());

  const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length) {
    SpreadsheetApp.getUi().alert(`KB sheet is missing required column(s): ${missing.join(", ")}`);
    return;
  }

  const rows = data.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] === undefined || row[i] === null ? "" : String(row[i]);
    });
    return obj;
  }).filter((r) => r.category && r.question && r.answer);

  const response = UrlFetchApp.fetch(webhookUrl, {
    method: "post",
    contentType: "application/json",
    headers: { "X-Sync-Secret": syncSecret },
    payload: JSON.stringify({ rows }),
    muteHttpExceptions: true,
  });

  const code = response.getResponseCode();
  if (code !== 200) {
    Logger.log(`Sync failed (${code}): ${response.getContentText()}`);
    // Avoid noisy alerts on every keystroke-triggered auto-sync; log only.
    if (code >= 500) return;
    SpreadsheetApp.getUi().alert(`Sync failed (${code}): ${response.getContentText()}`);
  } else {
    Logger.log(`Sync ok: ${response.getContentText()}`);
  }
}
