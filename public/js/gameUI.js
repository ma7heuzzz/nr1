// public/js/gameUI.js - Functions for rendering and interacting with the game board UI

import { getMyPlayerId } from "./stateManager.js"; // Import getMyPlayerId

let cellClickHandler = null;

/**
 * Renders the initial game board.
 * @param {HTMLElement} container - The container element for the board.
 * @param {Array<Array<object>>} boardData - The board state from the server.
 * @param {function} onClick - Callback function for cell clicks.
 * @param {string} boardSize - The size string (e.g., "3x3", "8x8").
 */
export function renderBoard(container, boardData, onClick, boardSize) {
    container.innerHTML = ""; // Clear previous board
    cellClickHandler = onClick; // Store the click handler

    const boardElement = document.createElement("div");
    boardElement.className = "game-board";
    // Add board size class for styling
    if (boardSize) {
        boardElement.classList.add(`board-${boardSize}`); // e.g., board-3x3, board-8x8
    }
    // Parse boardSize to get column count
    const cols = boardSize ? parseInt(boardSize.split("x")[1], 10) : (boardData[0]?.length || 8);
    boardElement.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    boardData.forEach(row => {
        row.forEach(cellData => {
            const cellElement = document.createElement("div");
            cellElement.className = "cell";
            cellElement.dataset.row = cellData.r;
            cellElement.dataset.col = cellData.c;
            cellElement.textContent = cellData.v;

            if (cellData.o) {
                cellElement.classList.add("claimed");
                // Assuming owner ID is the socket ID, add a class for styling
                // You might need a mapping from socket ID to player index (e.g., player-1, player-2)
                // For simplicity, let's add a generic owned class and maybe a specific one if needed later
                cellElement.classList.add(cellData.o === window.myPlayerId ? "owned-self" : "owned-opponent");
            }

            cellElement.addEventListener("click", handleCellClickEvent);
            boardElement.appendChild(cellElement);
        });
    });

    container.appendChild(boardElement);
}

/**
 * Updates the existing board display based on new state.
 * @param {HTMLElement} container - The container element for the board.
 * @param {Array<Array<object>>} boardData - The new board state from the server.
 * @param {string} boardSize - The size string (e.g., "3x3", "8x8").
 */
export function updateBoard(container, boardData, boardSize) {
    const boardElement = container.querySelector(".game-board");
    if (!boardElement) return; // Board not rendered yet

    // Ensure the board size class is present (might be redundant if never removed)
    if (boardSize && !boardElement.classList.contains(`board-${boardSize}`)) {
        // Remove old size classes if they exist
        boardElement.className = boardElement.className.replace(/board-\dx\d/g, '').trim();
        boardElement.classList.add(`board-${boardSize}`);
    }

    boardData.forEach(row => {
        row.forEach(cellData => {
            const cellElement = boardElement.querySelector(`[data-row="${cellData.r}"][data-col="${cellData.c}"]`);
            if (cellElement) {
                // Update owner status and class
                cellElement.classList.remove("owned-self", "owned-opponent", "claimed");
                if (cellData.o) {
                    cellElement.classList.add("claimed");
                    cellElement.classList.add(cellData.o === window.myPlayerId ? "owned-self" : "owned-opponent");
                }
                // Update value if necessary (though it usually doesn't change)
                // cellElement.textContent = cellData.v;
            }
        });
    });
}

/**
 * Highlights cells that are valid moves for the current player.
 * @param {Array<Array<object>>} boardData - The current board state.
 * @param {string} playerId - The ID of the current player.
 * @param {boolean} isFirstMove - Whether it's the player's first move.
 */
export function highlightValidMoves(boardData, playerId, isFirstMove) {
    const boardElement = document.querySelector(".game-board");
    if (!boardElement) return;

    const validMoves = getClientSideValidMoves(boardData, playerId, isFirstMove);

    validMoves.forEach(move => {
        const cellElement = boardElement.querySelector(`[data-row="${move.r}"][data-col="${move.c}"]`);
        if (cellElement) {
            cellElement.classList.add("valid-move");
        }
    });
}

/**
 * Removes all move highlights from the board.
 */
export function clearHighlights() {
    const boardElement = document.querySelector(".game-board");
    if (!boardElement) return;
    boardElement.querySelectorAll(".valid-move").forEach(cell => {
        cell.classList.remove("valid-move");
    });
}

// --- Internal Helper Functions ---

function handleCellClickEvent(event) {
    const cellElement = event.currentTarget;
    // Only trigger if it's a valid move for the current player
    if (cellElement.classList.contains("valid-move") && cellClickHandler) {
        const row = parseInt(cellElement.dataset.row, 10);
        const col = parseInt(cellElement.dataset.col, 10);
        cellClickHandler(row, col);
    }
}

// Client-side validation logic (mirroring server's Board.js)
function getClientSideValidMoves(boardData, playerId, isFirstMove) {
    const moves = [];
    const rows = boardData.length;
    const cols = boardData[0]?.length || 0;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cell = boardData[r][c];
            if (isClientSideValidMove(boardData, cell, playerId, isFirstMove)) {
                moves.push(cell);
            }
        }
    }
    return moves;
}

function isClientSideValidMove(boardData, cell, playerId, isFirstMove) {
    if (!cell || cell.o) {
        return false; // Cell doesn't exist or is already owned
    }
    if (isFirstMove) {
        return true;
    }
    return hasClientSideAdjacent(boardData, cell, playerId);
}

function hasClientSideAdjacent(boardData, cell, playerId) {
    const directions = [
        [0, 1], [1, 0], [-1, 0], [0, -1],
    ];
    const rows = boardData.length;
    const cols = boardData[0]?.length || 0;

    for (const [dr, dc] of directions) {
        const r = cell.r + dr;
        const c = cell.c + dc;
        if (r >= 0 && r < rows && c >= 0 && c < cols && boardData[r][c]?.o === playerId) {
            return true;
        }
    }
    return false;
}

// Expose myPlayerId to this module (needed for styling/validation)
// This assumes myPlayerId is set globally in client.js
// A better approach might be passing it explicitly or using a shared state module.
window.myPlayerId = window.myPlayerId || null; // Ensure it exists

