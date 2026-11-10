const input   = document.getElementById("base-url");
const btnSave = document.getElementById("btn-save");
const savedMsg = document.getElementById("saved-msg");

// Load saved URL on open
chrome.storage.sync.get(["baseUrl"], (stored) => {
  input.value = stored.baseUrl || "http://localhost:3001";
});

// Preset buttons
document.querySelectorAll(".preset-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    input.value = btn.dataset.url;
  });
});

// Save
btnSave.addEventListener("click", () => {
  const url = input.value.trim().replace(/\/$/, "");
  if (!url.startsWith("http")) {
    input.focus();
    return;
  }
  chrome.storage.sync.set({ baseUrl: url }, () => {
    savedMsg.style.display = "block";
    setTimeout(() => { savedMsg.style.display = "none"; }, 3000);
  });
});
