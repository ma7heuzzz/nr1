// Em public/js/client.js

// --- Imports ---
import { showScreen, showModal, hideModal } from "./ui.js";
import soundManager from "./soundManager.js";
import {
    initState, getSocket, getElements, setNicknameLocally, getNicknameLocally,
    hasNicknameBeenChanged, clearLocalNicknameData // Import necessary functions
} from "./stateManager.js";
import { initializeSocketHandlers } from "./socketHandlers.js";
import { renderNicknameScreen, renderMainMenuScreen, renderSettingsModal } from "./uiRenderers.js"; // Added renderSettingsModal
import {
    initializeStaticListeners,
    addNicknameInputListeners,
    addMainMenuListeners,
    addSettingsListeners // Added addSettingsListeners
} from "./eventListeners.js";

// --- Socket e State ---
const socket = io();
soundManager.init();
initState(socket);
initializeSocketHandlers(socket);

// --- Initial UI Setup & Nickname Handling ---
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM fully loaded and parsed");
    initializeStaticListeners();

    document.querySelectorAll(".screen").forEach(screen => screen.classList.remove("active"));

    const savedNicknameData = getNicknameLocally(); // Use centralized function

    if (savedNicknameData) { // Check if data exists (already handles expiration)
        console.log(`Found valid saved nickname: ${savedNicknameData.nickname}. Skipping input screen.`);
        // Nickname is already set in state by getNicknameLocally if valid
        // We just need to inform the server
        socket.emit("setNickname", { nickname: savedNicknameData.nickname });
        // Server will emit nicknameAccepted, which should trigger UI update via socketHandlers
        // Preemptively show main menu
        renderMainMenuScreen();
        addMainMenuListeners();
        showScreen(getElements().mainMenuScreen);
        handleDeepLink(); // Handle deep link after potential auto-login
    } else {
        console.log("No valid saved nickname found or nickname expired. Rendering nickname screen...");
        // clearLocalNicknameData(false) is called inside getNicknameLocally if expired/invalid
        renderNicknameScreen();
        addNicknameInputListeners();
        showScreen(getElements().nicknameScreen);
        handleDeepLink(); // Handle deep link even if showing nickname screen
    }

    // Render settings modal structure (it's hidden initially)
    renderSettingsModal();
    // Add listeners for the settings modal (including the change nickname button)
    addSettingsListeners();

    registerServiceWorker();
});

console.log("Client script loaded.");

// --- Deep Link Handling ---
function handleDeepLink() {
    const hash = window.location.hash;
    if (hash.startsWith("#join=")) {
        const roomIdToJoin = hash.substring(6); // Extract room ID after "#join="
        console.log("Deep link detected: Attempting to join room", roomIdToJoin);

        // Store the room ID to join after nickname is set
        sessionStorage.setItem("joinRoomId", roomIdToJoin);

        // Clear the hash so it's not processed again on reload
        history.pushState("", document.title, window.location.pathname + window.location.search);
    }
}

// --- Service Worker Registration Function ---
function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
        window.addEventListener("load", () => {
            navigator.serviceWorker.register("/sw.js")
              .then((registration) => {
                  console.log("Service Worker registered successfully:", registration.scope);
              })
              .catch((error) => {
                  console.error("Service Worker registration failed:", error);
              });
        });
    } else {
        console.log("Service Worker is not supported by this browser.");
    }
}

// --- Nickname Change Functionality (Triggered by Settings Modal Button) ---

// This function will be called by the event listener set up in addSettingsListeners
export function requestNicknameChange() { // Export it so eventListeners can import it
    if (hasNicknameBeenChanged()) {
        showModal("Você já alterou seu apelido uma vez.");
        return;
    }

    // Use a more integrated modal instead of prompt
    showModal(`
        <h3>Alterar Apelido</h3>
        <p>Digite seu novo apelido abaixo. Lembre-se, você só pode fazer isso uma vez!</p>
        <input type="text" id="new-nickname-input" placeholder="Novo Apelido" maxlength="15" style="margin-bottom: 10px; padding: 8px; width: calc(100% - 16px);">
        <button id="confirm-nickname-change" class="modal-button">Confirmar</button>
        <button id="cancel-nickname-change" class="modal-button secondary">Cancelar</button>
    `);

    const confirmButton = document.getElementById("confirm-nickname-change");
    const cancelButton = document.getElementById("cancel-nickname-change");
    const input = document.getElementById("new-nickname-input");

    const handleConfirm = () => {
        const newNickname = input.value.trim();
        if (newNickname) {
            console.log(`Attempting to change nickname to: ${newNickname}`);
            socket.emit("setNickname", { nickname: newNickname, isChange: true });
            hideModal();
        } else {
            // Maybe show a small error message within the modal?
            input.style.border = "1px solid red";
            input.placeholder = "Apelido não pode ser vazio";
        }
        // Clean up listeners
        confirmButton.removeEventListener("click", handleConfirm);
        cancelButton.removeEventListener("click", handleCancel);
    };

    const handleCancel = () => {
        hideModal();
        // Clean up listeners
        confirmButton.removeEventListener("click", handleConfirm);
        cancelButton.removeEventListener("click", handleCancel);
    };

    confirmButton.addEventListener("click", handleConfirm);
    cancelButton.addEventListener("click", handleCancel);
    input.focus();
}

// Note: Need to ensure socketHandlers.js handles the 'nicknameAccepted' event
// when isChange is true, calling setNicknameLocally(newNickname, true).

