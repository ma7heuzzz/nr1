// UI Helper Functions

/**
 * Shows a specific screen element and hides others.
 * @param {HTMLElement} screenElement - The screen element to show.
 */
export function showScreen(screenElement) {
    // Hide all screens first
    document.querySelectorAll(".screen").forEach(screen => {
        screen.classList.remove("active");
    });
    // Show the target screen
    if (screenElement) {
        screenElement.classList.add("active");
    }
}

/**
 * Hides a specific screen element.
 * @param {HTMLElement} screenElement - The screen element to hide.
 */
export function hideScreen(screenElement) {
    if (screenElement) {
        screenElement.classList.remove("active");
    }
}

/**
 * Shows the generic modal with the provided content.
 * @param {string | HTMLElement} content - HTML string or HTMLElement to display in the modal body.
 * @param {boolean} [showCloseButton=true] - Whether to show the close button.
 */
export function showModal(content, showCloseButton = true) {
    const modalContainer = document.getElementById("modal-container");
    const modalBody = document.getElementById("modal-body");
    const closeButton = modalContainer.querySelector(".modal-close-button");

    if (modalContainer && modalBody) {
        if (typeof content === "string") {
            modalBody.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            modalBody.innerHTML = ""; // Clear previous content
            modalBody.appendChild(content);
        }

        if (closeButton) {
            closeButton.style.display = showCloseButton ? "block" : "none";
        }

        modalContainer.classList.add("active");
    }
}

/**
 * Hides the generic modal.
 */
export function hideModal() {
    const modalContainer = document.getElementById("modal-container");
    if (modalContainer) {
        modalContainer.classList.remove("active");
        // Optional: Clear modal content after hiding
        const modalBody = document.getElementById("modal-body");
        if (modalBody) {
            // modalBody.innerHTML = "";
        }
    }
}




// --- Settings Modal Functions ---

/**
 * Shows the settings modal.
 */
export function showSettingsModal() {
    const settingsModalContainer = document.getElementById("settings-modal-container");
    if (settingsModalContainer) {
        settingsModalContainer.classList.add("active");
    }
}

/**
 * Hides the settings modal.
 */
export function hideSettingsModal() {
    const settingsModalContainer = document.getElementById("settings-modal-container");
    if (settingsModalContainer) {
        settingsModalContainer.classList.remove("active");
    }
}

