// uiUtils.js

// Function to update the speaking indicator UI for a player
export function updateSpeakingIndicator(playerId, isSpeaking) {
    const indicator = document.getElementById(`indicator-${playerId}`);
    if (indicator) {
        indicator.style.display = isSpeaking ? 'inline' : 'none';
        // Optional: Add/remove a class for more complex styling
        // indicator.classList.toggle('speaking', isSpeaking);
    }
}

