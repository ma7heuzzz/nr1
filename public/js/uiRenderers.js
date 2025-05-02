// uiRenderers.js
import {
    showScreen, showModal, hideModal
} from "./ui.js";
// Import game-specific rendering functions (NEW)
import {
    renderCheckersGame, updateCheckersGame,
    renderBattleshipGame, updateBattleshipGame,
    renderBackgammonGame, updateBackgammonGame,
    renderLudoGame, updateLudoGame,
    handleGameClick // Generic click handler (might need specialization later)
} from "./gameUI.js";
import {
    getElements, getSocket, getUserNickname, getCurrentTables, setMyPlayerId,
    getMyPlayerId, getCurrentGameState, cacheChatElements, getCurrentRoomId
} from "./stateManager.js";
// Import event listener setup functions
import {
    addLobbyBackButtonListener, addJoinButtonListeners, addLobbyRefreshButtonListener,
    addLobbySearchListener, addLeaveButtonListener, /* handleCellClick removed */
    addShareInviteButtonListener
} from "./eventListeners.js";
// Import voice chat listeners from the correct manager
import { addVoiceChatButtonListeners } from "./voiceChatManager.js";
// Import chat functions
import {
    addChatFormListener, addSystemChatMessage
} from "./chatHandler.js";
// Import voice chat functions for UI updates
import { updateVoiceChatUI, updateSpeakingIndicator } from "./voiceChatManager.js"; // Added updateSpeakingIndicator

// Define game names for display globally within the module
const gameDisplayNames = {
    'checkers': 'Dama',
    'battleship': 'Batalha Naval',
    'backgammon': 'Gamão',
    'ludo': 'Ludo'
};

export function renderNicknameScreen() {
    const elements = getElements();
    elements.nicknameScreen.innerHTML = `
        <h1>Insira seu Apelido</h1>
        <input type="text" id="nickname-input" placeholder="Seu apelido aqui..." maxlength="15">
        <button id="submit-nickname-button">Entrar</button>
        <p id="nickname-error" class="error-message" style="display: none; color: red; margin-top: 10px;"></p>
        <p id="connection-error" class="error-message" style="display: none; color: red; margin-top: 10px;"></p> <!-- Added connection error element -->
    `;
    // Listeners added in client.js
}

export function renderMainMenuScreen() {
    const elements = getElements();
    const userNickname = getUserNickname();
    elements.mainMenuScreen.innerHTML = `
        <h1>Bem-vindo, ${userNickname}!</h1>
        <div class="main-menu-options">
            <button id="view-tables-button">Ver Mesas</button>
            <button id="create-table-button">Criar Mesa</button>
        </div>
    `;
    // Listeners added in socketHandlers.js
}

// Helper function to render a single table item HTML
function renderTableItemHTML(table) {
    const gameName = gameDisplayNames[table.gameType] || table.gameType || 'Desconhecido';
    let statusText = '';
    if (table.hasVacancy) {
        statusText = `<button class="join-table-button" data-table-id="${table.id}">Entrar</button>`;
    } else {
        switch (table.status) {
            case 'placement':
                statusText = '<span>(Posicionando)</span>';
                break;
            case 'playing':
                statusText = '<span>(Em Jogo)</span>';
                break;
            case 'waiting': // Waiting but full
                statusText = '<span>(Cheia)</span>';
                break;
            default:
                statusText = '<span>(Indisponível)</span>'; // Fallback
        }
    }
    return `
    <div class="table-item" data-game-type="${table.gameType || 'unknown'}">
        <span>${table.name} (${gameName}) - ${table.playerCount}/${table.maxPlayers}</span>
        ${statusText}
    </div>
    `;
}

export function renderLobbyScreen(tables = []) {
    const elements = getElements();
    let tableListHTML = "<p>Nenhuma mesa disponível.</p>";

    if (tables.length > 0) {
        tableListHTML = tables.map(renderTableItemHTML).join("");
    }

    const searchInput = elements.lobbyScreen.querySelector("#search-table-input");
    const searchValue = searchInput ? searchInput.value : "";

    elements.lobbyScreen.innerHTML = `
        <h1>Lobby</h1>
        <div class="lobby-controls">
            <input type="text" id="search-table-input" placeholder="Pesquisar nome da mesa..." value="${searchValue}">
        </div>
        <div class="lobby-controls">
          <button id="refresh-lobby-button">Atualizar</button>
        </div>
        <div id="table-list-container">
            ${tableListHTML}
        </div>
        <button id="back-to-menu-button">Voltar</button>
    `;

    // Add listeners
    addLobbyBackButtonListener();
    addJoinButtonListeners();
    addLobbyRefreshButtonListener();
    addLobbySearchListener();

    // Re-apply filter if search value exists
    if (searchValue) {
        const searchTerm = searchValue.toLowerCase();
        const currentTables = getCurrentTables(); // Assuming getCurrentTables() is up-to-date
        const filteredTables = currentTables.filter(table =>
          table.name.toLowerCase().includes(searchTerm)
        );
        renderFilteredTableList(filteredTables); // Call the specific function to render filtered list
    }
}

export function renderCreateTableModal() {
    // Define allowed games with internal keys and display names
    const allowedGames = {
        'checkers': 'Dama',
        'battleship': 'Batalha Naval',
        'backgammon': 'Gamão',
        'ludo': 'Ludo'
    };
    const defaultGame = 'checkers'; // Set a default game

    const gameOptions = Object.entries(allowedGames).map(([key, name]) =>
        `<option value="${key}" ${key === defaultGame ? "selected" : ""}>${name}</option>`
    ).join("");

    showModal(`
        <h2>Criar Nova Mesa</h2>
        <div class="form-group">
            <label for="new-table-name">Nome da Mesa:</label>
            <input type="text" id="new-table-name" placeholder="(Opcional)" maxlength="20">
        </div>
        <div class="form-group">
            <label for="new-game-type">Jogo:</label>
            <select id="new-game-type">
                ${gameOptions}
            </select>
        </div>
        <button id="confirm-create-table-button">Criar</button>
        <p id="create-table-error" class="error-message" style="display: none; color: red; margin-top: 10px;"></p>
    `);
    // Listeners added in eventListeners.js
}

export function renderWaitingRoomScreen(data) {
    const elements = getElements();
    const { tableId, tableName, players, gameType } = data; // Added gameType
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
             <div id="game-rules-placeholder"></div>
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
    // TODO: Fetch and display basic rules for gameType in #game-rules-placeholder (Step 012)
}

export function renderGameRoomScreen(initialState) {
    const elements = getElements();
    const userNickname = getUserNickname();
    let myPlayerId = getMyPlayerId();

    // Destructure state, ensuring defaults for potentially missing parts
    const { players = {}, scores = {}, playerOrder = [], gameType, currentPlayerId, currentPlayerNickname } = initialState;

    if (!myPlayerId) {
        myPlayerId = getSocket().id;
        setMyPlayerId(myPlayerId);
    }

    const opponentId = playerOrder.find(id => id !== myPlayerId);
    const opponentNickname = opponentId && players[opponentId] ? players[opponentId] : "Aguardando...";
    const myScore = scores[myPlayerId] !== undefined ? scores[myPlayerId] : 0;
    const opponentScore = opponentId && scores[opponentId] !== undefined ? scores[opponentId] : 0;
    const gameName = gameDisplayNames[gameType] || gameType || 'Desconhecido';

    console.log("Rendering Game Room:", { myPlayerId, opponentId, userNickname, opponentNickname, scores, players, playerOrder, gameType }); // Debug log

    elements.gameRoomScreen.innerHTML = `
        <div id="game-area">
            <div class="game-info">
                <div class="player-score player-self">
                    <span>${userNickname} (Você):</span>
                    <span id="my-score">${myScore}</span>
                    <span class="speaking-indicator" id="indicator-${myPlayerId}" style="display: none;">🎤</span> <!-- Start hidden -->
                </div>
                <div class="turn-indicator">
                    <span id="turn-text">Turno de: ${currentPlayerNickname || 'N/A'} ${currentPlayerId === myPlayerId ? "(Você)" : ""}</span>
                    <span class="game-type-indicator">(${gameName})</span>
                </div>
                <div class="player-score player-opponent">
                    <span>${opponentNickname}:</span>
                    <span id="opponent-score">${opponentScore}</span>
                    ${opponentId ? `<span class="speaking-indicator" id="indicator-${opponentId}" style="display: none;">🎤</span>` : ''} <!-- Start hidden -->
                </div>
            </div>
            <div id="game-board-container"></div> <!-- Container for game-specific UI -->
            <!-- Placeholder for game rules -->
            <div id="game-rules-placeholder"></div>
            <div class="game-controls">
                 <!-- Voice Chat Buttons -->
                 <button id="toggle-voice-button" class="voice-button">🎤 Ativar Voz</button>
                 <button id="toggle-mute-button" class="voice-button" disabled>🔇 Mutar</button>
                 <!-- Other Controls -->
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
    if (!boardContainer) {
        console.error("Game board container not found!");
        return;
    }

    // --- Game-Specific Rendering --- NEW
    try {
        switch (gameType) {
            case 'checkers':
                renderCheckersGame(boardContainer, initialState, handleGameClick);
                break;
            case 'battleship':
                renderBattleshipGame(boardContainer, initialState, handleGameClick);
                break;
            case 'backgammon':
                renderBackgammonGame(boardContainer, initialState, handleGameClick);
                break;
            case 'ludo':
                renderLudoGame(boardContainer, initialState, handleGameClick);
                break;
            default:
                console.error(`Unsupported game type for rendering: ${gameType}`);
                boardContainer.innerHTML = `<p>Erro: Tipo de jogo '${gameName}' não suportado para renderização.</p>`;
        }
    } catch (error) {
        console.error(`Error rendering game ${gameType}:`, error);
        boardContainer.innerHTML = `<p>Erro ao renderizar o jogo '${gameName}'. Verifique o console.</p>`;
    }
    // --- End Game-Specific Rendering ---

    // Add common listeners
    addLeaveButtonListener();
    addChatFormListener();
    addVoiceChatButtonListeners();
    addSystemChatMessage(`O jogo começou! ${opponentId ? "" : "Aguardando oponente..."}`);
    // Initial UI state for voice chat buttons
    updateVoiceChatUI();
    // Initialize speaking indicators (hidden)
    updateSpeakingIndicator(myPlayerId, false);
    if (opponentId) updateSpeakingIndicator(opponentId, false);
    // TODO: Fetch and display basic rules for gameType in #game-rules-placeholder (Step 012)
}

export function updateGameRoomScreen(newState) {
    const elements = getElements();
    let myPlayerId = getMyPlayerId();
    const { scores = {}, currentPlayerId, currentPlayerNickname, players = {}, playerOrder = [], gameType } = newState;

    if (!myPlayerId) {
        myPlayerId = getSocket().id;
        setMyPlayerId(myPlayerId);
    }

    const opponentId = playerOrder.find(id => id !== myPlayerId);

    // Update Scores
    const myScoreEl = document.getElementById("my-score");
    const opponentScoreEl = document.getElementById("opponent-score");
    if (myScoreEl) myScoreEl.textContent = scores[myPlayerId] || 0;
    if (opponentScoreEl) opponentScoreEl.textContent = scores[opponentId] || 0;

    // Update Turn Indicator
    const turnTextEl = document.getElementById("turn-text");
    if (turnTextEl) turnTextEl.textContent = `Turno de: ${currentPlayerNickname || 'N/A'} ${currentPlayerId === myPlayerId ? "(Você)" : ""}`;

    // Update Game Type Indicator (shouldn't change, but good practice)
    const gameName = gameDisplayNames[gameType] || gameType || 'Desconhecido';
    const gameTypeIndicatorEl = document.querySelector(".game-type-indicator");
    if (gameTypeIndicatorEl) gameTypeIndicatorEl.textContent = `(${gameName})`;

    // Update Opponent Nickname (if changed)
    const opponentNicknameEl = document.querySelector(".player-opponent > span:first-child");
    if (opponentNicknameEl && opponentId && players[opponentId]) {
        const currentOpponentName = opponentNicknameEl.textContent.replace(':', '');
        if (currentOpponentName !== players[opponentId]) {
             opponentNicknameEl.textContent = `${players[opponentId]}:`;
             // Ensure indicator exists for opponent if name changed
             if (!document.getElementById(`indicator-${opponentId}`)) {
                 const indicator = document.createElement("span");
                 indicator.className = "speaking-indicator";
                 indicator.id = `indicator-${opponentId}`;
                 indicator.textContent = "🎤";
                 indicator.style.display = "none"; // Start hidden
                 opponentNicknameEl.parentNode.appendChild(indicator);
             }
        }
    }

    // --- Game-Specific Update --- NEW
    const boardContainer = elements.gameRoomScreen.querySelector("#game-board-container");
    if (boardContainer) {
        try {
            switch (gameType) {
                case 'checkers':
                    updateCheckersGame(boardContainer, newState);
                    break;
                case 'battleship':
                    updateBattleshipGame(boardContainer, newState);
                    break;
                case 'backgammon':
                    updateBackgammonGame(boardContainer, newState);
                    break;
                case 'ludo':
                    updateLudoGame(boardContainer, newState);
                    break;
                default:
                    console.error(`Unsupported game type for update: ${gameType}`);
                    // Optionally update a message in the container
            }
        } catch (error) {
            console.error(`Error updating game ${gameType}:`, error);
            // Optionally update a message in the container
        }
    }
    // --- End Game-Specific Update ---
}

export function renderFilteredTableList(filteredTables) {
    const elements = getElements();
    const container = elements.lobbyScreen.querySelector("#table-list-container");
    if (!container) return;

    let tableListHTML = "<p>Nenhuma mesa encontrada.</p>";
    if (filteredTables.length > 0) {
        tableListHTML = filteredTables.map(renderTableItemHTML).join("");
    }
    container.innerHTML = tableListHTML;
    addJoinButtonListeners(); // Re-add listeners for the newly rendered buttons
}

export function renderGameOverScreen(data) {
    const elements = getElements();
    const myPlayerId = getMyPlayerId();
    const userNickname = getUserNickname();
    const { winnerNickname, scores = {}, reason, winnerId } = data;
    const myScore = scores[myPlayerId] || 0;
    const opponentId = Object.keys(scores).find(id => id !== myPlayerId);
    const opponentScore = opponentId ? scores[opponentId] || 0 : 0;
    const opponentNickname = opponentId ? (getCurrentGameState()?.players[opponentId] || "Oponente") : "Oponente";

    let message = `Fim de jogo!`;
    if (reason) {
        message = reason;
    } else if (winnerId === null) {
        message += ` Empate!`;
    } else if (winnerId === myPlayerId) {
        message += ` Parabéns, ${userNickname}, você venceu!`;
    } else {
        message += ` ${winnerNickname} venceu.`;
    }

    showModal(`
        <h2>Fim de Jogo</h2>
        <p>${message}</p>
        <p>Placar Final:</p>
        <p>${userNickname} (Você): ${myScore}</p>
        <p>${opponentNickname}: ${opponentScore}</p>
        <button id="back-to-lobby-button">Voltar ao Lobby</button>
    `);

    // Add listener for the button
    const backButton = document.getElementById("back-to-lobby-button");
    if (backButton) {
        backButton.addEventListener("click", () => {
            hideModal();
            // Optionally emit an event to server or directly transition UI
            getSocket().emit("leaveRoom"); // Assuming leaveRoom handles going back to lobby
        }, { once: true }); // Ensure listener is added only once
    }
}

// Render settings modal structure (called once on load)
export function renderSettingsModal() {
    const elements = getElements();
    if (!elements.settingsModalContainer) return;

    elements.settingsModalContainer.innerHTML = `
        <div class="settings-modal-content">
            <span class="settings-close-button">&times;</span>
            <h2>Configurações</h2>
            <div class="settings-option">
                <label for="sound-toggle">Som:</label>
                <button id="sound-toggle">🔊 Som Ligado</button> <!-- Initial state -->
            </div>
            <div class="settings-option">
                <label for="fullscreen-toggle">Tela Cheia:</label>
                <button id="fullscreen-toggle">⛶ Entrar Tela Cheia</button> <!-- Initial state -->
            </div>
            <div class="settings-option">
                <label for="change-nickname-button">Apelido:</label>
                <button id="change-nickname-button">Alterar Apelido</button>
            </div>
            <!-- Add more settings options here -->
        </div>
    `;
    // Re-query close button after rendering
    elements.settingsCloseButton = elements.settingsModalContainer.querySelector(".settings-close-button");
    // Re-query other buttons if needed, though initState might handle them
    elements.soundToggleButton = document.getElementById("sound-toggle");
    elements.fullscreenToggleButton = document.getElementById("fullscreen-toggle");
    elements.changeNicknameButton = document.getElementById("change-nickname-button");
}

