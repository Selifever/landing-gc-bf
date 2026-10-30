// Optional: paste into the sheet (Extensions > Apps Script) to update the landing as soon as the sheet changes,
// instead of waiting for the 15-minute schedule.
// 1. Project Settings > Script properties: add GITHUB_TOKEN = a fine-grained token for Selifever/landing-gc-bf
//    with "Contents: Read and write" only.
// 2. Triggers > Add trigger: function onSheetChange, event source "From spreadsheet", event type "On change".
//    Add a second one with event type "On edit" if you also want plain cell edits to trigger it.
function onSheetChange() {
  const cache = CacheService.getScriptCache();
  if (cache.get("dispatched")) return; // at most one run per minute while editing
  cache.put("dispatched", "1", 60);
  UrlFetchApp.fetch("https://api.github.com/repos/Selifever/landing-gc-bf/dispatches", {
    method: "post",
    contentType: "application/json",
    headers: {
      Authorization: "Bearer " + PropertiesService.getScriptProperties().getProperty("GITHUB_TOKEN"),
      Accept: "application/vnd.github+json"
    },
    payload: JSON.stringify({ event_type: "sheet-updated" })
  });
}
