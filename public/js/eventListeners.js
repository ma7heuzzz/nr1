// eventListeners.js
import {
    showScreen, hideModal, showSettingsModal, hideSettingsModal
} from "./ui.js";
import soundManager from "./soundManager.js";
import {
    getElements, getSocket, getMyPlayerId, getCurrentGameState, getCurrentTables, getUserNickname
} from "./stateManager.js";
// Import renderers used by listeners
// *** FIX: Import renderCreateTableModal from the correct file ***
import {
    renderFilteredTableList
} from "./lobbyRenderer.js"; // Import from lobbyRenderer
import {
    renderMainMenuScreen,
    renderCreateTableModal // *** FIX: Import from uiRenderers ***
} from "./uiRenderers.js"; // Import from uiRenderers where it currently resides

// Import sharing functions
import { shareContent, generateInviteLink } from "./sharingHandler.js";

// --- Nickname Screen Listeners ---
export function addNicknameInputListeners() {
    const elements = getElements();
    const socket = getSocket();
    const input = elements.nicknameScreen.querySelector("#nickname-input");
    const button = elements.nicknameScreen.querySelector("#submit-nickname-button");
    const errorP = elements.nicknameScreen.querySelector("#nickname-error");

    console.log("Attempting to add nickname listeners. Button found:", !!button, "Input found:", !!input);

    let newInput = null;
    let newButton = null;

    if (input) {
        newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);
        newInput.addEventListener("keypress", (event) => {
            if (event.key === "Enter" && newButton) {
                newButton.click();
            }
        });
    } else {
        console.error("Nickname input element not found!");
        return;
    }

    if (button) {
        newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);

        console.log("Adding click listener to nickname button");
        newButton.addEventListener("click", () => {
            console.log("Nickname button clicked!");
            const nickname = newInput.value.trim();
            if (nickname) {
                console.log(`Attempting to emit setNickname: ${nickname}`);
                newButton.disabled = true;
                newButton.textContent = "Entrando...";
                socket.emit("setNickname", { nickname });
                errorP.style.display = "none";
            } else {
                console.log("Nickname input was empty.");
                errorP.textContent = "Apelido não pode estar vazio!";
                errorP.style.display = "block";
            }
        });
    } else {
        console.error("Nickname submit button not found!");
    }
}

// --- Main Menu Listeners ---
export function addMainMenuListeners() {
    const elements = getElements();
    const socket = getSocket();
    const viewTablesButton = elements.mainMenuScreen.querySelector("#view-tables-button");
    const createTableButton = elements.mainMenuScreen.querySelector("#create-table-button");

    if (viewTablesButton) {
        const newButton = viewTablesButton.cloneNode(true);
        viewTablesButton.parentNode.replaceChild(newButton, viewTablesButton);
        newButton.addEventListener("click", () => {
            console.log("View Tables clicked");
            showScreen(elements.lobbyScreen);
            // Initial render structure - list filled by socket event
            elements.lobbyScreen.innerHTML = `
                <h1>Lobby</h1>
                <div class="lobby-controls">
                    <input type="text" id="search-table-input" placeholder="Pesquisar nome da mesa...">
                </div>
                 <div class="lobby-controls">
                    <button id="refresh-lobby-button">Atualizar</button>
                </div>
                <div id="table-list-container">Carregando mesas...</div>
                <button id="back-to-menu-button">Voltar</button>
            `;
            addLobbyBackButtonListener();
            addLobbyRefreshButtonListener();
            addLobbySearchListener();
            socket.emit("listTables");
        });
    }

    if (createTableButton) {
        const newButton = createTableButton.cloneNode(true);
        createTableButton.parentNode.replaceChild(newButton, createTableButton);
        newButton.addEventListener("click", () => {
            console.log("Create Table clicked");
            renderCreateTableModal(); // Call the function imported from uiRenderers.js
            addCreateTableModalListeners(); // Add listeners after rendering modal content
        });
    }
}

// --- Lobby Listeners ---
export function addLobbyBackButtonListener() {
    const elements = getElements();
    const backButton = elements.lobbyScreen.querySelector("#back-to-menu-button");
    if (backButton) {
        const newButton = backButton.cloneNode(true);
        backButton.parentNode.replaceChild(newButton, backButton);
        newButton.addEventListener("click", () => {
            showScreen(elements.mainMenuScreen);
            // Optionally re-render main menu if needed, e.g., if nickname could change
            // renderMainMenuScreen();
            // addMainMenuListeners();
        });
    }
}

export function addJoinButtonListeners() {
    const elements = getElements();
    const socket = getSocket();
    elements.lobbyScreen.querySelectorAll(".join-table-button").forEach(button => {
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);

        newButton.addEventListener("click", (event) => {
            const tableId = event.target.dataset.tableId;
            console.log(`Attempting to join table: ${tableId}`);
            socket.emit("joinTable", { tableId });
        });
    });
}

export function addLobbyRefreshButtonListener() {
    const elements = getElements();
    const socket = getSocket();
    const refreshButton = elements.lobbyScreen.querySelector("#refresh-lobby-button");
    if (refreshButton) {
        const newButton = refreshButton.cloneNode(true);
        refreshButton.parentNode.replaceChild(newButton, refreshButton);

        newButton.addEventListener("click", () => {
            console.log("Refreshing lobby list...");
            const container = elements.lobbyScreen.querySelector("#table-list-container");
            if(container) container.innerHTML = "Carregando mesas...";
            socket.emit("listTables");
        });
    }
}

export function addLobbySearchListener() {
    const elements = getElements();
    const searchInput = elements.lobbyScreen.querySelector("#search-table-input");
    if (searchInput) {
        const newInput = searchInput.cloneNode(true);
        searchInput.parentNode.replaceChild(newInput, searchInput);

        newInput.addEventListener("input", (event) => {
            const searchTerm = event.target.value.toLowerCase();
            const currentTables = getCurrentTables();
            const filteredTables = currentTables.filter(table =>
              table.name.toLowerCase().includes(searchTerm)
            );
            renderFilteredTableList(filteredTables); // This function now resides in lobbyRenderer.js
        });
    }
}

// --- Create Table Modal Listeners ---
export function addCreateTableModalListeners() {
    const socket = getSocket();
    const modalBody = document.getElementById("modal-body");
    if (!modalBody) {
        console.error("Modal body (#modal-body) not found when adding listeners.");
        return;
    }
    const modalTableNameInput = modalBody.querySelector("#new-table-name");
    const modalGameTypeSelect = modalBody.querySelector("#new-game-type"); // *** FIX: Correct ID ***
    const modalConfirmButton = modalBody.querySelector("#confirm-create-table-button");
    const modalErrorP = modalBody.querySelector("#create-table-error");

    // Check if elements were found
    if (!modalTableNameInput || !modalGameTypeSelect || !modalConfirmButton || !modalErrorP) {
        console.error("One or more elements not found in create table modal:", {
            input: !!modalTableNameInput,
            select: !!modalGameTypeSelect,
            button: !!modalConfirmButton,
            error: !!modalErrorP
        });
        return;
    }

    // Use cloneNode to prevent duplicate listeners if modal is re-rendered
    const newButton = modalConfirmButton.cloneNode(true);
    modalConfirmButton.parentNode.replaceChild(newButton, modalConfirmButton);

    newButton.addEventListener("click", () => {
        const tableName = modalTableNameInput.value.trim();
        const gameType = modalGameTypeSelect.value; // *** FIX: Use correct variable and read game type ***

        if (tableName.length > 20) {
            modalErrorP.textContent = "Nome da mesa muito longo (máx 20 caracteres).";
            modalErrorP.style.display = "block";
            return;
        }
        console.log(`Requesting to create table with name: ${tableName || "(Default)"} and game type: ${gameType}`);
        // *** FIX: Send gameType instead of boardSize ***
        socket.emit("createTable", { tableName: tableName || null, gameType: gameType });
        modalErrorP.style.display = "none";
        newButton.textContent = "Criando...";
        newButton.disabled = true;
    });
}


// --- Game Room Listeners ---
export function addLeaveButtonListener() {
    const socket = getSocket();
    // Use a more specific selector if needed, but ID should be unique
    const leaveButton = document.getElementById("leave-room-button");
    if (leaveButton) {
        const newButton = leaveButton.cloneNode(true);
        leaveButton.parentNode.replaceChild(newButton, leaveButton);

        newButton.addEventListener("click", () => {
            console.log("Leaving room...");
            socket.emit("leaveTable");
        });
    }
}

// TODO: This needs to be game-specific. Move or adapt.
export function handleCellClick(row, col) {
    const socket = getSocket();
    const currentGameState = getCurrentGameState();
    const myPlayerId = getMyPlayerId();

    if (!currentGameState || currentGameState.currentPlayerId !== myPlayerId) {
        console.log("Not your turn or game not active.");
        return;
    }

    soundManager.playSound("click");
    console.log(`Clicked cell (${row}, ${col}). Sending action...`);
    // Action type might need to be dynamic based on game
    socket.emit("playerAction", { type: "claimCell", row, col });
}

// --- Sharing Listeners ---

export function addShareInviteButtonListener() {
    const shareButton = document.getElementById("share-invite-button");
    if (shareButton) {
        const newButton = shareButton.cloneNode(true);
        shareButton.parentNode.replaceChild(newButton, shareButton);

        newButton.addEventListener("click", (event) => {
            const roomId = event.target.dataset.roomId;
            if (!roomId) {
                console.error("Share invite button missing room ID!");
                return;
            }
            const inviteLink = generateInviteLink(roomId);
            const shareData = {
                title: "Convite para Jogar", // Generic title
                text: `Venha jogar comigo! Entre na minha mesa aqui:`,
                url: inviteLink
            };
            const fallbackText = `Venha jogar comigo! Entre na minha mesa aqui: ${inviteLink}`;
            shareContent(shareData, fallbackText);
        });
    }
}

export function addShareResultButtonListener() {
    const shareButton = document.getElementById("share-result-button");
    if (shareButton) {
        const newButton = shareButton.cloneNode(true);
        shareButton.parentNode.replaceChild(newButton, shareButton);

        newButton.addEventListener("click", (event) => {
            const button = event.target;
            const winner = button.dataset.winner;
            const myScore = button.dataset.myScore;
            const opponentScore = button.dataset.opponentScore;
            const myNickname = button.dataset.myNickname;
            const opponentNickname = button.dataset.opponentNickname;
            const gameName = getCurrentGameState()?.gameType || "o jogo"; // Get game name if possible

            let resultText = "";
            if (winner === myNickname) {
                resultText = `Eu venci ${opponentNickname} em ${gameName} com um placar de ${myScore} a ${opponentScore}! 🎉`;
            } else if (winner === opponentNickname) {
                resultText = `Joguei ${gameName} contra ${opponentNickname} e o placar foi ${myScore} a ${opponentScore}.`;
            } else { // Draw or other reason
                resultText = `Joguei ${gameName} e o placar final foi ${myScore} a ${opponentScore}.`;
            }

            const shareData = {
                title: `Resultado da Partida de ${gameName}`,
                text: `${resultText} Jogue também!`, // Add call to action
                url: window.location.origin // Share the main game URL
            };
            const fallbackText = `${resultText} Jogue também em ${window.location.origin}`;
            shareContent(shareData, fallbackText);
        });
    }
}


// --- Generic Modal Listeners ---
export function addGenericModalListeners() {
    const elements = getElements();
    if (elements.modalCloseButton) {
        // Use cloneNode to ensure only one listener
        const newButton = elements.modalCloseButton.cloneNode(true);
        elements.modalCloseButton.parentNode.replaceChild(newButton, elements.modalCloseButton);
        newButton.addEventListener("click", hideModal);
    }
    if (elements.modalContainer) {
        // Use cloneNode trickier here, maybe check for existing listener?
        // Or rely on it being called only once during init.
        elements.modalContainer.addEventListener("click", (event) => {
            if (event.target === elements.modalContainer) {
                hideModal();
            }
        });
    }
}

// --- Settings Modal Listeners ---

function updateSoundButtonIcon() {
    const elements = getElements();
    if (elements.soundToggleButton) {
        elements.soundToggleButton.textContent = soundManager.isMuted ? "🔇 Som Desativado" : "🔊 Som Ativado";
    }
}

function updateFullscreenButtonIcon() {
    const elements = getElements();
    if (elements.fullscreenToggleButton) {
        elements.fullscreenToggleButton.textContent = document.fullscreenElement ? "Sair Tela Cheia" : "Tela Cheia ⛶";
    }
}

export function addSettingsModalListeners() {
    const elements = getElements();

    // Open Settings Modal
    if (elements.settingsButton) {
        elements.settingsButton.addEventListener("click", () => {
            updateSoundButtonIcon();
            updateFullscreenButtonIcon();
            showSettingsModal();
        });
    }

    // Close Settings Modal (Button)
    if (elements.settingsCloseButton) {
        elements.settingsCloseButton.addEventListener("click", hideSettingsModal);
    }

    // Close Settings Modal (Overlay Click)
    if (elements.settingsModalContainer) {
        elements.settingsModalContainer.addEventListener("click", (event) => {
            if (event.target === elements.settingsModalContainer) {
                hideSettingsModal();
            }
        });
    }

    // Sound Toggle
    if (elements.soundToggleButton) {
        elements.soundToggleButton.addEventListener("click", () => {
            soundManager.toggleMute();
            updateSoundButtonIcon();
        });
    }

    // Fullscreen Toggle
    if (elements.fullscreenToggleButton) {
        elements.fullscreenToggleButton.addEventListener("click", () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
                    showModal(`Não foi possível entrar em tela cheia: ${err.message}`);
                });
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
            }
        });
    }

    // Update fullscreen button icon when state changes
    document.addEventListener("fullscreenchange", updateFullscreenButtonIcon);

    // Initial state updates on load
    updateSoundButtonIcon();
    updateFullscreenButtonIcon();
}

// --- Voice Chat Listeners ---
// Moved to voiceChatManager.js to keep related logic together
// export function addVoiceChatButtonListeners() { ... }


// Function to initialize all static listeners on DOMContentLoaded
export function initializeStaticListeners() {
    addGenericModalListeners();
    addSettingsModalListeners();
}

