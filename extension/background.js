/**
 * DeadlineOS Background Service Worker (Manifest V3)
 *
 * Handles communication between popup and content scripts,
 * and can relay API calls when the popup is not open.
 */

// Re-open the popup action badge to show unsaved captures
chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeBackgroundColor({ color: "#E3542F" });
});
