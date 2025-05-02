// sharingHandler.js

import { showModal } from "./ui.js";

/**
 * Attempts to use the Web Share API to share content.
 * Provides a fallback to copy text to the clipboard if the API is unavailable or fails.
 * @param {object} shareData - Data to share (title, text, url).
 * @param {string} fallbackText - Text to copy to clipboard as fallback.
 */
export async function shareContent(shareData, fallbackText) {
    if (navigator.share) {
        try {
            await navigator.share(shareData);
            console.log("Content shared successfully using Web Share API!");
        } catch (err) {
            console.error("Error using Web Share API:", err);
            // Fallback to clipboard if sharing fails (e.g., user cancels)
            copyToClipboard(fallbackText);
        }
    } else {
        console.log("Web Share API not supported, falling back to clipboard.");
        copyToClipboard(fallbackText);
    }
}

/**
 * Copies the given text to the clipboard.
 * Shows a modal notification to the user.
 * @param {string} text - The text to copy.
 */
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        console.log("Text copied to clipboard:", text);
        showModal("Link copiado para a área de transferência!");
    }).catch(err => {
        console.error("Failed to copy text to clipboard:", err);
        showModal("Falha ao copiar link. Por favor, copie manualmente.");
    });
}

/**
 * Generates a shareable link for joining a specific table.
 * @param {string} roomId - The ID of the room to join.
 * @returns {string} - The shareable URL.
 */
export function generateInviteLink(roomId) {
    // Use the current window location origin and add the fragment
    return `${window.location.origin}/#join=${roomId}`;
}

