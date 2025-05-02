// socketHandlers.js
import {
    showScreen, hideScreen, showModal, hideModal
} from "./ui.js";
import {
    renderBoard, updateBoard, highlightValidMoves, clearHighlights
} from "./gameUI.js";
import soundManager from "./soundManager.js";
import {
    getElements, setMyPlayerId, setUserNickname, setCurrentTables, setCurrentRoomId,
    setCurrentGameState, getMyPlayerId, getUserNickname, getCurrentGameState, cacheChatElements
} from "./stateManager.js";
// Import rendering functions
import {
    renderNicknameScreen, renderMainMenuScreen, renderLobbyScreen, renderGameRoomScreen,
    updateGameRoomScreen, renderCreateTableModal, renderWaitingRoomScreen, renderGameOverScreen
} from "./uiRenderers.js";
// Import listener functions
import {
    addMainMenuListeners, addShareResultButtonListener, addLeaveButtonListener, addShareInviteButtonListener
} from "./eventListeners.js";
// Import chat functions
import {
    addChatMessage, addSystemChatMessage, addChatFormListener
} from "./chatHandler.js";
// Import voice chat functions
import {
    initVoiceChat, startVoiceChat, stopVoiceChat, handleNewPeer
} from "./voiceChatManager.js";

export function initializeSocketHandlers(socket) {
    const elements = getElements();

    // Initialize voice chat listeners (listens for signals etc.)
    initVoiceChat();

    socket.on("connect", () => {
        console.log("Connected to server with ID:", socket.id);
        hideScreen(elements.loadingScreen);

        // Clear potential error messages
        let errorElement = document.getElementById("connection-error") || document.getElementById("nickname-error");
        if (errorElement) {
            errorElement.style.display = "none";
        }
        const nicknameButton = document.getElementById("submit-nickname-button");
        if (nicknameButton) {
            nicknameButton.disabled = false;
            nicknameButton.textContent = "Entrar";
        }
    });

    socket.on("disconnect", (reason) => {
        console.log("Disconnected from server:", reason);
        stopVoiceChat(); // Stop voice chat on disconnect
        document.querySelectorAll(".screen").forEach(screen => screen.classList.remove("active"));
        showModal("Desconectado do servidor. Verifique sua conexão.", false);
        setUserNickname(null);
        setCurrentRoomId(null);
        setCurrentGameState(null);
    });

    socket.on("connect_error", (err) => {
        console.error("Connection Error:", err.message);
        showConnectionError(err.message);
    });

    socket.on("connect_timeout", (timeout) => {
        console.error("Connection Timeout:", timeout);
        showConnectionError("Tempo limite de conexão excedido.");
    });

    socket.on("error", (err) => {
        console.error("Generic Socket Error:", err);
        showConnectionError("Ocorreu um erro inesperado na conexão.");
    });

    socket.on("nicknameAccepted", (data) => {
        console.log("Received nicknameSet from server:", data);
        setUserNickname(data.nickname);
        setMyPlayerId(socket.id);

        const roomIdToJoin = sessionStorage.getItem("joinRoomId");
        if (roomIdToJoin) {
            console.log("Attempting to join room from deep link:", roomIdToJoin);
            socket.emit("joinTable", { tableId: roomIdToJoin });
            sessionStorage.removeItem("joinRoomId");
        } else {
            renderMainMenuScreen();
            addMainMenuListeners();
            showScreen(elements.mainMenuScreen);
        }
        hideModal();
    });

    socket.on("nicknameRejected", (data) => {
        console.log("Received nicknameError from server:", data);
        const errorP = document.getElementById("nickname-error");
        if (errorP) {
            errorP.textContent = data.message;
            errorP.style.display = "block";
        }
        const button = document.getElementById("submit-nickname-button");
        if (button) {
            button.disabled = false;
        }
    });

    socket.on("tableListUpdate", (tables) => {
        console.log("Received table list update:", tables);
        setCurrentTables(tables);
        if (elements.lobbyScreen.classList.contains("active")) {
            renderLobbyScreen(tables);
        }
    });

    socket.on("tableCreated", (data) => {
        console.log(`Table created: ID ${data.tableId}, Name: ${data.tableName}`);
        hideModal();
        setCurrentRoomId(data.tableId);
        renderWaitingRoomScreen(data);
        showScreen(elements.gameRoomScreen);
        // NOTE: Voice chat will start when the second player joins (via playerJoined or gameStart)
    });

    socket.on("tableCreationFailed", (data) => {
        console.error("Table creation failed:", data.reason);
        const modalConfirmButton = document.getElementById("confirm-create-table-button");
        const modalErrorP = document.getElementById("create-table-error");
        if (modalErrorP) {
            modalErrorP.textContent = data.reason;
            modalErrorP.style.display = "block";
        }
        if (modalConfirmButton) {
            modalConfirmButton.textContent = "Criar";
            modalConfirmButton.disabled = false;
        }
    });

    socket.on("joinedTable", (data) => {
        console.log(`Successfully joined table: ${data.tableName} (${data.tableId})`);
        hideModal();
        setCurrentRoomId(data.tableId);
        renderWaitingRoomScreen(data);
        showScreen(elements.gameRoomScreen);
        // If joining a table that already has another player, start voice chat
        if (data.players && data.players.length > 1) {
            const otherPlayerIds = data.players.map(p => p.id).filter(id => id !== getMyPlayerId());
            startVoiceChat(otherPlayerIds);
        }
    });

    socket.on("joinTableFailed", (data) => {
        console.error("Failed to join table:", data.reason);
        showModal(`Falha ao entrar na mesa: ${data.reason}`);
        if (elements.lobbyScreen.classList.contains("active")) {
            socket.emit("listTables");
        }
    });

    socket.on("playerJoined", (data) => {
        console.log(`Player ${data.nickname} joined the room.`);
        addSystemChatMessage(`${data.nickname} entrou na sala.`);
        // Handle new peer for voice chat if it's active
        handleNewPeer(data.id);
        // If this is the second player joining, start voice chat for the first player
        // This logic might be better placed in gameStart or handled by the server sending initial peers
        // For now, handleNewPeer should suffice if voice chat is already active for the existing player.
    });

    socket.on("playerLeft", (data) => {
        console.log(`Player ${data.nickname} left the room.`);
        addSystemChatMessage(`${data.nickname} saiu da sala.`);
        // Voice chat cleanup for this peer is handled by voiceChatManager via 'voiceUserDisconnected' event (server needs to send this)
        const gameState = getCurrentGameState();
        if (elements.gameRoomScreen.classList.contains("active")) {
            if (!gameState) { // If in waiting room
                const opponentScoreEl = document.getElementById("opponent-score");
                if (opponentScoreEl && opponentScoreEl.previousElementSibling) {
                    opponentScoreEl.previousElementSibling.textContent = "Aguardando...:";
                    opponentScoreEl.textContent = "0";
                }
            }
        }
    });

    socket.on("gameStart", (initialState) => {
        console.log("Game starting!", initialState);
        setCurrentGameState(initialState);
        soundManager.playSound("game_start");
        renderGameRoomScreen(initialState);
        showScreen(elements.gameRoomScreen);
        // Start voice chat with the opponent
        const opponentId = Object.keys(initialState.players).find(id => id !== getMyPlayerId());
        if (opponentId) {
            startVoiceChat([opponentId]);
        }
    });

    socket.on("gameStateUpdate", (newState) => {
        console.log("Received game state update:", newState);
        const oldState = getCurrentGameState();
        setCurrentGameState(newState);
        updateGameRoomScreen(newState);
        if (oldState && oldState.currentPlayerId !== getMyPlayerId() && newState.currentPlayerId === getMyPlayerId() && newState.lastMove) {
            // soundManager.playSound("opponent_move"); // Need this sound
        }
    });

    socket.on("gameOver", (data) => {
        console.log("Game over!", data);
        stopVoiceChat(); // Stop voice chat when game ends
        const myPlayerId = getMyPlayerId();
        if (data.winnerId === myPlayerId) {
            soundManager.playSound("game_win");
        } else if (data.winnerId && data.winnerId !== myPlayerId) {
            soundManager.playSound("game_lose");
        }
        renderGameOverScreen(data);
        addShareResultButtonListener();
        setCurrentGameState(null);
        addSystemChatMessage(`Fim de jogo! Vencedor: ${data.winnerNickname}. Placar final: Você ${data.scores[myPlayerId] || 0} x ${data.scores[Object.keys(data.scores).find(id => id !== myPlayerId)] || 0}`);
    });

    socket.on("invalidMove", (data) => {
        console.warn("Invalid move:", data.reason);
        const turnTextEl = document.getElementById("turn-text");
        if (turnTextEl) {
            const originalText = turnTextEl.textContent;
            turnTextEl.textContent = data.reason;
            turnTextEl.style.color = "#F44336";
            setTimeout(() => {
                const currentState = getCurrentGameState();
                if (currentState && turnTextEl.textContent === data.reason) {
                    turnTextEl.textContent = `Turno de: ${currentState.currentPlayerNickname} ${currentState.currentPlayerId === getMyPlayerId() ? "(Você)" : ""}`;
                    turnTextEl.style.color = "#ffcc00";
                }
            }, 2000);
        }
    });

    socket.on("forceMainMenu", (data) => {
        console.log("Forced back to main menu:", data?.reason || "No reason given");
        stopVoiceChat(); // Stop voice chat when forced out
        setCurrentRoomId(null);
        setCurrentGameState(null);
        document.querySelectorAll(".screen").forEach(screen => screen.classList.remove("active"));
        renderMainMenuScreen();
        addMainMenuListeners();
        showScreen(elements.mainMenuScreen);
        if (data?.reason) {
            showModal(`Aviso: ${data.reason}`);
        }
    });

    // Chat Message Handler
    socket.on("chatMessage", (data) => {
        console.log("Chat message received:", data);
        const isSelf = data.senderId === getMyPlayerId();
        addChatMessage(data.senderNickname, data.message, isSelf);
        if (!isSelf) {
            soundManager.playSound("chat_message");
        }
    });

    socket.on("chatError", (data) => {
        console.warn("Chat error:", data.reason);
        addSystemChatMessage(`[Erro Chat] ${data.reason}`);
    });

    // --- Voice Chat Specific Handlers (from voiceChatManager) ---
    // These are now handled internally by initVoiceChat()
    // socket.on('voiceSignal', ...);
    // socket.on('voiceUserDisconnected', ...);
}

// Helper function for connection errors
function showConnectionError(message) {
    let errorElement = document.getElementById("connection-error") || document.getElementById("nickname-error");
    if (errorElement) {
        errorElement.textContent = `Erro de conexão: ${message}. Verifique sua internet ou tente recarregar a página.`;
        errorElement.style.display = "block";
        errorElement.style.color = "red";
    } else {
        alert(`Erro de conexão: ${message}`);
    }
    const nicknameButton = document.getElementById("submit-nickname-button");
    if (nicknameButton) {
        nicknameButton.disabled = true;
        nicknameButton.textContent = "Erro de Conexão";
    }
}

