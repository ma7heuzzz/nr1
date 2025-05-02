// stateManager.js

let state = {
    userNickname: null,
    currentTables: [],
    currentRoomId: null,
    currentGameState: null,
    myPlayerId: null,
    socket: null, // Store the socket instance here
    elements: { // Cache UI elements
        loadingScreen: document.getElementById("loading-screen"),
        nicknameScreen: document.getElementById("nickname-screen"),
        mainMenuScreen: document.getElementById("main-menu-screen"),
        lobbyScreen: document.getElementById("lobby-screen"),
        gameRoomScreen: document.getElementById("game-room-screen"),
        modalContainer: document.getElementById("modal-container"),
        modalBody: document.getElementById("modal-body"),
        modalCloseButton: document.querySelector(".modal-close-button"),
        // Settings elements (can be added here or managed in settingsHandler)
        settingsButton: document.getElementById("settings-button"),
        settingsModalContainer: document.getElementById("settings-modal-container"),
        settingsCloseButton: null, // Query later
        soundToggleButton: null, // Query later
        fullscreenToggleButton: null, // Query later
        changeNicknameButton: null, // Query later for settings modal
        // Chat elements
        chatContainer: null,
        chatMessages: null,
        chatForm: null,
        chatInput: null,
    }
};

// --- Constants for localStorage ---
const NICKNAME_STORAGE_KEY = "playerNickname";
const NICKNAME_EXPIRATION_KEY = "nicknameExpiration";
const NICKNAME_CHANGED_KEY = "nicknameChanged";
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export function initState(socketInstance) {
    state.socket = socketInstance;
    // Query elements that might not exist initially
    state.elements.settingsCloseButton = state.elements.settingsModalContainer?.querySelector(".settings-close-button");
    state.elements.soundToggleButton = document.getElementById("sound-toggle");
    state.elements.fullscreenToggleButton = document.getElementById("fullscreen-toggle");
    state.elements.changeNicknameButton = document.getElementById("change-nickname-button"); // Query the change button
    console.log("State initialized");
}

export function getSocket() {
    return state.socket;
}

export function getElements() {
    return state.elements;
}

export function getMyPlayerId() {
    return state.myPlayerId;
}

export function setMyPlayerId(id) {
    state.myPlayerId = id;
    window.myPlayerId = id; // Keep global for gameUI compatibility for now
}

export function getUserNickname() {
    return state.userNickname;
}

export function setUserNickname(nickname) {
    state.userNickname = nickname;
}

export function getCurrentTables() {
    return state.currentTables;
}

export function setCurrentTables(tables) {
    state.currentTables = tables;
}

export function getCurrentRoomId() {
    return state.currentRoomId;
}

export function setCurrentRoomId(roomId) {
    state.currentRoomId = roomId;
}

export function getCurrentGameState() {
    return state.currentGameState;
}

export function setCurrentGameState(gameState) {
    state.currentGameState = gameState;
}

// Function to cache chat elements when game room is rendered
export function cacheChatElements() {
    state.elements.chatContainer = document.getElementById("chat-container");
    state.elements.chatMessages = document.getElementById("chat-messages");
    state.elements.chatForm = document.getElementById("chat-form");
    state.elements.chatInput = document.getElementById("chat-input");
}

// --- Nickname Persistence Logic (localStorage) ---

/**
 * Retrieves nickname data from localStorage.
 * @returns {object|null} Object with nickname and expiration, or null if not found/expired.
 */
export function getNicknameLocally() {
    try {
        const nickname = localStorage.getItem(NICKNAME_STORAGE_KEY);
        const expirationString = localStorage.getItem(NICKNAME_EXPIRATION_KEY);

        if (!nickname || !expirationString) {
            console.log("No nickname or expiration found in localStorage.");
            clearLocalNicknameData(false); // Clear potentially partial data, keep changed status
            return null;
        }

        const expiration = parseInt(expirationString, 10);
        if (isNaN(expiration) || Date.now() >= expiration) {
            console.log("Nickname found in localStorage, but it has expired.");
            clearLocalNicknameData(false); // Clear expired data, keep changed status
            return null;
        }

        console.log(`Valid nickname found in localStorage: ${nickname}, expires: ${new Date(expiration)}`);
        return { nickname, expiration };
    } catch (error) {
        console.error("Error reading nickname from localStorage:", error);
        clearLocalNicknameData(false); // Clear potentially corrupted data
        return null;
    }
}

/**
 * Saves nickname and sets expiration (1 year) in localStorage.
 * Also updates the in-memory state.
 * @param {string} nickname - The nickname to save.
 * @param {boolean} isChange - Whether this is a nickname change operation.
 */
export function setNicknameLocally(nickname, isChange = false) {
    try {
        const expiration = Date.now() + ONE_YEAR_MS;
        localStorage.setItem(NICKNAME_STORAGE_KEY, nickname);
        localStorage.setItem(NICKNAME_EXPIRATION_KEY, expiration.toString());
        setUserNickname(nickname); // Update in-memory state
        console.log(`Nickname "${nickname}" saved locally, expires: ${new Date(expiration)}`);

        if (isChange) {
            setNicknameChangeStatus();
        }
    } catch (error) {
        console.error("Error saving nickname to localStorage:", error);
        // Optionally: notify user about storage issue
    }
}

/**
 * Marks in localStorage that the nickname has been changed.
 */
export function setNicknameChangeStatus() {
    try {
        localStorage.setItem(NICKNAME_CHANGED_KEY, "true");
        console.log("Nickname change status marked as true in localStorage.");
        // Disable change button if it exists
        if (state.elements.changeNicknameButton) {
            state.elements.changeNicknameButton.disabled = true;
            state.elements.changeNicknameButton.title = "Apelido já alterado";
        }
    } catch (error) {
        console.error("Error setting nickname change status in localStorage:", error);
    }
}

/**
 * Checks localStorage to see if the nickname has already been changed.
 * @returns {boolean} True if the nickname has been changed, false otherwise.
 */
export function hasNicknameBeenChanged() {
    try {
        return localStorage.getItem(NICKNAME_CHANGED_KEY) === "true";
    } catch (error) {
        console.error("Error reading nickname change status from localStorage:", error);
        return false; // Assume not changed if error occurs
    }
}

/**
 * Clears nickname-related data from localStorage.
 * @param {boolean} clearChangeStatus - Whether to also clear the changed status flag.
 */
export function clearLocalNicknameData(clearChangeStatus = true) {
    try {
        localStorage.removeItem(NICKNAME_STORAGE_KEY);
        localStorage.removeItem(NICKNAME_EXPIRATION_KEY);
        if (clearChangeStatus) {
            localStorage.removeItem(NICKNAME_CHANGED_KEY);
            console.log("Cleared all nickname data from localStorage.");
        } else {
            console.log("Cleared nickname and expiration from localStorage, kept change status.");
        }
    } catch (error) {
        console.error("Error clearing nickname data from localStorage:", error);
    }
}

