// /home/ubuntu/phase4_game/public/js/gameRoomRenderer.js

import {
    getElements, getUserNickname, getMyPlayerId, setMyPlayerId,
    getSocket, getCurrentGameState, cacheChatElements, getCurrentRoomId
} from "./stateManager.js";
import {
    renderBoard, updateBoard // Assuming these are generic or will be replaced by game-specific renderers
    // TODO: Import game-specific rendering functions (e.g., renderCheckersBoard)
} from "./gameUI.js";
import {
    addLeaveButtonListener, handleCellClick, // handleCellClick might become game-specific
    addShareInviteButtonListener, addVoiceChatButtonListeners
} from "./eventListeners.js";
import {
    addChatFormListener, addSystemChatMessage
} from "./chatHandler.js";
import { updateVoiceChatUI } from "./voiceChatManager.js";

// Define game names for display globally within the module
// TODO: Consider moving this to a shared constants file if used elsewhere
const gameDisplayNames = {
    'checkers': 'Dama',
    'battleship': 'Batalha Naval',
    'backgammon': 'Gamão',
    'ludo': 'Ludo'
};

// Function to fetch and display game rules (placeholder)
async function displayGameRules(gameType, container) {
    if (!container) return;
    const rulesPath = `/rules/${gameType}_rules.md`;
    try {
        const response = await fetch(rulesPath);
        if (response.ok) {
            const rulesText = await response.text();
            // Basic Markdown rendering (replace ###, *, etc.) - Consider a library for complex MD
            let html = rulesText
                .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                .replace(/^
\*   (.*$)/gim, '<li>$1</li>') // Handle list items starting with * and spaces
                .replace(/<li>/g, '<ul><li>') // Start ul on first li
                .replace(/<\/li>\n([^<])/gim, '</li></ul>\n$1') // Close ul if next line isn't li
                .replace(/<\/li>$/gim, '</li></ul>'); // Close ul at the end
             // Ensure all lists are closed properly
            const openLists = (html.match(/<ul>/g) || []).length;
            const closedLists = (html.match(/<\/ul>/g) || []).length;
            html += '</ul>'.repeat(openLists - closedLists);

            container.innerHTML = `<h2>Regras Básicas (${gameDisplayNames[gameType] || gameType})</h2>${html}`;
        } else {
            container.innerHTML = `<p>Regras para ${gameDisplayNames[gameType] || gameType} não encontradas.</p>`;
        }
    } catch (error) {
        console.error("Error fetching game rules:", error);
        container.innerHTML = `<p>Erro ao carregar as regras.</p>`;
    }
}

export function renderWaitingRoomScreen(data) {
    const elements = getElements();
    const { tableName, players, gameType } = data;
    const roomId = getCurrentRoomId();
    const gameName = gameDisplayNames[gameType] || gameType || 'Desconhecido';

    elements.gameRoomScreen.innerHTML = `
        <div id="game-area">
             <h1>Mesa: ${tableName} (${gameName})</h1>
             <p>Jogadores: ${Object.values(players).join(", ")}</p>
             <p>Aguardando oponente...</p>
             <div class="game-controls">
                 <button id="share-invite-button" data-room-id="${roomId}">Convidar Amigo</button>
                 <button id="leave-room-button">Sair da Mesa</button>
             </div>
             <!-- Placeholder for game rules -->
             <div id="game-rules-placeholder" class="rules-container"></div>
             <!-- Placeholder for voice chat indicators -->
             <div id="voice-indicators"></div>
        </div>
        <div id="chat-container">
            <div id="chat-messages"></div>
            <form id="chat-form">
                <input type="text" id="chat-input" placeholder="Digite sua mensagem..." maxlength="100" autocomplete="off">
                <button type="submit">Enviar</button>
            </form>
        </div>
    `;
    cacheChatElements();
    // Add listeners
    addLeaveButtonListener();
    addChatFormListener();
    addShareInviteButtonListener();
    addSystemChatMessage("Você entrou na sala. Aguardando oponente...");
    // Initial UI state for voice chat (buttons likely disabled/hidden here)
    updateVoiceChatUI();
    // Fetch and display basic rules
    const rulesContainer = elements.gameRoomScreen.querySelector("#game-rules-placeholder");
    displayGameRules(gameType, rulesContainer);
}

export function renderGameRoomScreen(initialState) {
    const elements = getElements();
    const userNickname = getUserNickname();
    let myPlayerId = getMyPlayerId();

    // Destructure carefully, gameState might contain board, scores etc. or they might be top-level
    const { players, playerOrder, gameType, gameState } = initialState;
    const { board, scores, currentPlayerId, currentPlayerNickname } = gameState; // Assuming game logic returns state nested like this

    if (!myPlayerId) {
        myPlayerId = getSocket().id;
        setMyPlayerId(myPlayerId);
    }

    const opponentId = playerOrder.find(id => id !== myPlayerId);
    const opponentNickname = opponentId ? players[opponentId] : "Aguardando...";
    const gameName = gameDisplayNames[gameType] || gameType || 'Desconhecido';

    elements.gameRoomScreen.innerHTML = `
        <div id="game-area">
            <div class="game-info">
                <div class="player-score player-self">
                    <span>${userNickname} (Você):</span>
                    <span id="my-score">${scores[myPlayerId] || 0}</span>
                    <span class="speaking-indicator" id="indicator-${myPlayerId}">🎤</span>
                </div>
                <div class="turn-indicator">
                    <span id="turn-text">Turno de: ${currentPlayerNickname} ${currentPlayerId === myPlayerId ? "(Você)" : ""}</span>
                    <span class="game-type-indicator">(${gameName})</span>
                </div>
                <div class="player-score player-opponent">
                    <span>${opponentNickname}:</span>
                    <span id="opponent-score">${scores[opponentId] || 0}</span>
                    <span class="speaking-indicator" id="indicator-${opponentId}">🎤</span>
                </div>
            </div>
            <div id="game-board-container"></div>
            <div id="game-rules-placeholder" class="rules-container"></div>
            <div class="game-controls">
                 <button id="toggle-voice-button" class="voice-button">🎤 Ativar Voz</button>
                 <button id="toggle-mute-button" class="voice-button" disabled>🔇 Mutar</button>
                 <button id="leave-room-button">Sair da Mesa</button>
            </div>
        </div>
        <div id="chat-container">
            <div id="chat-messages"></div>
            <form id="chat-form">
                <input type="text" id="chat-input" placeholder="Digite sua mensagem..." maxlength="100" autocomplete="off">
                <button type="submit">Enviar</button>
            </form>
        </div>
    `;

    cacheChatElements();

    const boardContainer = elements.gameRoomScreen.querySelector("#game-board-container");
    // TODO: Replace renderBoard with game-specific rendering based on gameType
    // Example placeholder call:
    renderBoard(boardContainer, board, handleCellClick, '8x8'); // Placeholder size, adjust as needed

    // TODO: Replace highlightValidMoves with game-specific logic
    // if (currentPlayerId === myPlayerId) {
    //     highlightValidMoves(gameState.board, myPlayerId, !gameState.firstMoveMade?.[myPlayerId]);
    // }

    // Add listeners
    addLeaveButtonListener();
    addChatFormListener();
    addVoiceChatButtonListeners();
    addSystemChatMessage(`O jogo começou! ${opponentId ? "" : "Aguardando oponente..."}`);
    // Initial UI state for voice chat buttons
    updateVoiceChatUI();
    // Initialize speaking indicators (hidden)
    updateSpeakingIndicator(myPlayerId, false);
    if (opponentId) updateSpeakingIndicator(opponentId, false);

    // Fetch and display basic rules
    const rulesContainer = elements.gameRoomScreen.querySelector("#game-rules-placeholder");
    displayGameRules(gameType, rulesContainer);
}

export function updateGameRoomScreen(newState) {
    const elements = getElements();
    let myPlayerId = getMyPlayerId();
    // Destructure carefully based on what the server sends on update
    const { players, playerOrder, gameType, gameState } = newState;
    const { board, scores, currentPlayerId, currentPlayerNickname } = gameState;

    if (!myPlayerId) {
        myPlayerId = getSocket().id;
        setMyPlayerId(myPlayerId);
    }

    const opponentId = playerOrder.find(id => id !== myPlayerId);

    const myScoreEl = document.getElementById("my-score");
    const opponentScoreEl = document.getElementById("opponent-score");
    if (myScoreEl) myScoreEl.textContent = scores[myPlayerId] || 0;
    if (opponentScoreEl) opponentScoreEl.textContent = scores[opponentId] || 0;

    const turnTextEl = document.getElementById("turn-text");
    if (turnTextEl) turnTextEl.textContent = `Turno de: ${currentPlayerNickname} ${currentPlayerId === myPlayerId ? "(Você)" : ""}`;

    const gameName = gameDisplayNames[gameType] || gameType || 'Desconhecido';
    const gameTypeIndicatorEl = document.querySelector(".game-type-indicator");
    if (gameTypeIndicatorEl) gameTypeIndicatorEl.textContent = `(${gameName})`;

    const boardContainer = elements.gameRoomScreen.querySelector("#game-board-container");
    if (boardContainer) {
        // TODO: Replace updateBoard with game-specific rendering based on gameType
        updateBoard(boardContainer, board, '8x8'); // Placeholder size, adjust as needed
    }

    // TODO: Replace highlightValidMoves with game-specific logic
    // clearHighlights();
    // if (currentPlayerId === myPlayerId) {
    //     highlightValidMoves(gameState.board, myPlayerId, !gameState.firstMoveMade?.[myPlayerId]);
    // }

    // Update opponent nickname if it changed
    const opponentNicknameEl = document.querySelector(".player-opponent > span:first-child");
    if (opponentNicknameEl && opponentId && players[opponentId]) {
        opponentNicknameEl.textContent = `${players[opponentId]}:`;
        if (!document.getElementById(`indicator-${opponentId}`)) {
            const indicator = document.createElement("span");
            indicator.className = "speaking-indicator";
            indicator.id = `indicator-${opponentId}`;
            indicator.textContent = "🎤";
            indicator.style.display = "none";
            opponentNicknameEl.parentNode.appendChild(indicator);
        }
    }
}

export function renderGameOverScreen(data) {
    const elements = getElements();
    const myPlayerId = getMyPlayerId();
    const userNickname = getUserNickname();
    const { winnerNickname, scores, reason, winnerId } = data;
    const myScore = scores[myPlayerId] || 0;
    const opponentId = Object.keys(scores).find(id => id !== myPlayerId);
    const opponentScore = opponentId ? scores[opponentId] || 0 : 0;
    const opponentNickname = opponentId ? (getCurrentGameState()?.players[opponentId] || "Oponente") : "Oponente";

    let message = `Fim de jogo! Vencedor: ${winnerNickname}.`;
    if (reason) {
        message = reason;
    }
    if (winnerId === null && !reason) {
        message = "Fim de jogo! Empate.";
    }

    const turnTextEl = document.getElementById("turn-text");
    if (turnTextEl) {
        turnTextEl.textContent = message;
        if (winnerId === myPlayerId) {
            turnTextEl.style.color = "#4CAF50"; // Green
        } else if (winnerId === null) {
            turnTextEl.style.color = "#ffcc00"; // Yellow
        } else {
            turnTextEl.style.color = "#F44336"; // Red
        }
    }

    const controlsDiv = elements.gameRoomScreen.querySelector(".game-controls");
    if (controlsDiv) {
        const voiceButton = controlsDiv.querySelector("#toggle-voice-button");
        const muteButton = controlsDiv.querySelector("#toggle-mute-button");
        if (voiceButton) voiceButton.remove();
        if (muteButton) muteButton.remove();

        if (!controlsDiv.querySelector("#share-result-button")) {
            const shareButton = document.createElement("button");
            shareButton.id = "share-result-button";
            shareButton.textContent = "Compartilhar Resultado";
            shareButton.dataset.winner = winnerNickname;
            shareButton.dataset.myScore = myScore;
            shareButton.dataset.opponentScore = opponentScore;
            shareButton.dataset.myNickname = userNickname;
            shareButton.dataset.opponentNickname = opponentNickname;
            controlsDiv.appendChild(shareButton);
            // Listener added in socketHandlers.js
        }
    }
    updateVoiceChatUI();
    updateSpeakingIndicator(myPlayerId, false);
    if (opponentId) updateSpeakingIndicator(opponentId, false);
}

/**
 * Updates the visual indicator for a player's speaking status.
 * @param {string} playerId - The ID of the player.
 * @param {boolean} isSpeaking - True if the player is speaking, false otherwise.
 */
export function updateSpeakingIndicator(playerId, isSpeaking) {
    const indicator = document.getElementById(`indicator-${playerId}`);
    if (indicator) {
        indicator.style.display = isSpeaking ? "inline" : "none";
    }
}

