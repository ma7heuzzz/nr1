// chatHandler.js
import { getElements, getSocket, getMyPlayerId } from "./stateManager.js";
import soundManager from "./soundManager.js";

export function addChatFormListener() {
    const elements = getElements();
    const socket = getSocket();
    if (elements.chatForm) {
        elements.chatForm.addEventListener("submit", (event) => {
            event.preventDefault();
            const message = elements.chatInput.value.trim();
            if (message) {
                // Send message to server
                socket.emit("chatMessage", { message });
                elements.chatInput.value = ""; // Clear input
            }
        });
    }
}

export function addChatMessage(nickname, message, isSelf = false) {
    const elements = getElements();
    if (!elements.chatMessages) return;

    const messageElement = document.createElement("div");
    messageElement.classList.add("chat-message");
    if (isSelf) {
        messageElement.style.color = "#a0c4ff"; // Slightly different color for self
    }

    const nickSpan = document.createElement("span");
    nickSpan.classList.add("nickname");
    nickSpan.textContent = nickname + ":";

    const textSpan = document.createElement("span");
    textSpan.classList.add("text");
    // Basic sanitization (replace < and > to prevent HTML injection)
    // Consider a more robust library if complex sanitization is needed
    textSpan.textContent = message.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    messageElement.appendChild(nickSpan);
    messageElement.appendChild(textSpan);

    elements.chatMessages.appendChild(messageElement);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight; // Scroll to bottom
}

export function addSystemChatMessage(message) {
    const elements = getElements();
    if (!elements.chatMessages) return;

    const messageElement = document.createElement("div");
    messageElement.classList.add("chat-message", "system-message");
    messageElement.textContent = message;

    elements.chatMessages.appendChild(messageElement);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight; // Scroll to bottom
}

