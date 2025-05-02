// /home/ubuntu/phase4_game/server/games/checkers/checkersLogic.js

const BOARD_SIZE = 8;

// Piece types
const EMPTY = 0;
const PLAYER1_MAN = 1;
const PLAYER1_KING = 2;
const PLAYER2_MAN = 3;
const PLAYER2_KING = 4;

// Player mapping (assuming playerOrder[0] is Player 1, playerOrder[1] is Player 2)
const getPlayerInfo = (playerId, playerOrder) => {
    if (playerId === playerOrder[0]) {
        return { // Player 1 (starts at bottom, moves up)
            id: playerId,
            man: PLAYER1_MAN,
            king: PLAYER1_KING,
            opponentMan: PLAYER2_MAN,
            opponentKing: PLAYER2_KING,
            direction: -1, // Moves upwards (row index decreases)
            promotionRow: 0
        };
    }
    return { // Player 2 (starts at top, moves down)
        id: playerId,
        man: PLAYER2_MAN,
        king: PLAYER2_KING,
        opponentMan: PLAYER1_MAN,
        opponentKing: PLAYER1_KING,
        direction: 1, // Moves downwards (row index increases)
        promotionRow: BOARD_SIZE - 1
    };
};

/**
 * Initializes the Checkers game state.
 * @param {string[]} playerOrder - Array containing the IDs of the two players.
 * @returns {object} The initial game state.
 */
function initializeCheckersState(playerOrder) {
    const board = createInitialBoard();
    const initialState = {
        gameType: 'checkers',
        board: board,
        playerOrder: playerOrder, // [player1Id, player2Id]
        currentPlayerId: playerOrder[0], // Player 1 starts
        scores: { [playerOrder[0]]: 0, [playerOrder[1]]: 0 }, // Score represents captured pieces
        winnerId: null,
        gameOver: false,
        forcedJumps: null, // Stores available jumps for the current player: [{ from: {r, c}, to: {r, c}, captured: {r, c} }]
        lastMove: null,
        consecutiveNonCaptureMoves: 0, // For draw condition
    };
    // Calculate initial forced jumps for the starting player
    initialState.forcedJumps = findForcedJumps(initialState.board, initialState.currentPlayerId, initialState.playerOrder);
    return initialState;
}

/**
 * Creates the initial Checkers board setup.
 * @returns {Array<Array<number>>} A 2D array representing the board.
 */
function createInitialBoard() {
    const board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(EMPTY));
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if ((r + c) % 2 !== 0) { // Only place pieces on dark squares
                if (r < 3) {
                    board[r][c] = PLAYER2_MAN; // Player 2 (opponent) at the top
                }
                if (r > 4) {
                    board[r][c] = PLAYER1_MAN; // Player 1 (starting player) at the bottom
                }
            }
        }
    }
    return board;
}

// --- Helper Functions ---

function isWithinBounds(r, c) {
    return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
}

function getPieceAt(board, r, c) {
    return isWithinBounds(r, c) ? board[r][c] : null;
}

/**
 * Finds all valid moves (simple moves and jumps) for a specific piece.
 * @param {Array<Array<number>>} board - The current board state.
 * @param {number} r - Row of the piece.
 * @param {number} c - Column of the piece.
 * @param {string} playerId - The ID of the player owning the piece.
 * @param {string[]} playerOrder - The order of players.
 * @returns {{moves: Array<{r: number, c: number}>, jumps: Array<{to: {r: number, c: number}, captured: {r: number, c: number}}>}}
 */
function findPossibleMovesForPiece(board, r, c, playerId, playerOrder) {
    const piece = getPieceAt(board, r, c);
    if (!piece) return { moves: [], jumps: [] };

    const playerInfo = getPlayerInfo(playerId, playerOrder);
    if (piece !== playerInfo.man && piece !== playerInfo.king) {
        return { moves: [], jumps: [] }; // Not the player's piece
    }

    const moves = [];
    const jumps = [];
    const directions = [-1, 1]; // For column changes (left/right)
    const moveDirs = [playerInfo.direction]; // Forward direction for men
    if (piece === playerInfo.king) {
        moveDirs.push(-playerInfo.direction); // Add backward direction for kings
    }

    // Check Jumps first (mandatory)
    for (const dr of moveDirs) { // Row direction (up/down)
        for (const dc of directions) { // Column direction (left/right)
            const jumpOverR = r + dr;
            const jumpOverC = c + dc;
            const landR = r + 2 * dr;
            const landC = c + 2 * dc;

            if (isWithinBounds(landR, landC) && getPieceAt(board, landR, landC) === EMPTY) {
                const jumpedPiece = getPieceAt(board, jumpOverR, jumpOverC);
                if (jumpedPiece === playerInfo.opponentMan || jumpedPiece === playerInfo.opponentKing) {
                    jumps.push({ to: { r: landR, c: landC }, captured: { r: jumpOverR, c: jumpOverC } });
                }
            }
        }
    }

    // If no jumps are found, check simple moves
    if (jumps.length === 0) {
        for (const dr of moveDirs) {
            for (const dc of directions) {
                const moveR = r + dr;
                const moveC = c + dc;
                if (isWithinBounds(moveR, moveC) && getPieceAt(board, moveR, moveC) === EMPTY) {
                    moves.push({ r: moveR, c: moveC });
                }
            }
        }
    }

    return { moves, jumps };
}

/**
 * Finds all forced jumps for the current player.
 * @param {Array<Array<number>>} board - The current board state.
 * @param {string} playerId - The ID of the player whose turn it is.
 * @param {string[]} playerOrder - The order of players.
 * @returns {Array<{from: {r: number, c: number}, to: {r: number, c: number}, captured: {r: number, c: number}}> | null}
 */
function findForcedJumps(board, playerId, playerOrder) {
    const forcedJumps = [];
    const playerInfo = getPlayerInfo(playerId, playerOrder);

    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const piece = getPieceAt(board, r, c);
            if (piece === playerInfo.man || piece === playerInfo.king) {
                const { jumps } = findPossibleMovesForPiece(board, r, c, playerId, playerOrder);
                if (jumps.length > 0) {
                    jumps.forEach(jump => forcedJumps.push({ from: { r, c }, ...jump }));
                }
            }
        }
    }
    return forcedJumps.length > 0 ? forcedJumps : null;
}

/**
 * Checks if a player has any valid moves left.
 * @param {Array<Array<number>>} board - The current board state.
 * @param {string} playerId - The ID of the player to check.
 * @param {string[]} playerOrder - The order of players.
 * @returns {boolean} True if the player has valid moves, false otherwise.
 */
function playerHasMoves(board, playerId, playerOrder) {
    const playerInfo = getPlayerInfo(playerId, playerOrder);
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const piece = getPieceAt(board, r, c);
            if (piece === playerInfo.man || piece === playerInfo.king) {
                const { moves, jumps } = findPossibleMovesForPiece(board, r, c, playerId, playerOrder);
                if (moves.length > 0 || jumps.length > 0) {
                    return true;
                }
            }
        }
    }
    return false;
}

/**
 * Checks for win condition.
 * @param {Array<Array<number>>} board - The current board state.
 * @param {string} nextPlayerId - The ID of the player whose turn is next.
 * @param {string[]} playerOrder - The order of players.
 * @returns {string | null} The ID of the winner, or null if no winner yet.
 */
function checkWinCondition(board, nextPlayerId, playerOrder) {
    if (!playerHasMoves(board, nextPlayerId, playerOrder)) {
        // If the next player has no moves, the current player wins
        return playerOrder.find(id => id !== nextPlayerId);
    }
    return null;
}

/**
 * Checks for draw condition (e.g., too many moves without capture).
 * @param {number} consecutiveNonCaptureMoves
 * @returns {boolean} True if the game is a draw.
 */
function checkDrawCondition(consecutiveNonCaptureMoves) {
    // Example: Draw after 50 moves (25 by each player) without a capture or man moving.
    // A simpler rule: Draw after 40 consecutive non-capture moves.
    return consecutiveNonCaptureMoves >= 40;
}

/**
 * Processes a player's move in Checkers.
 * @param {object} currentState - The current game state.
 * @param {string} playerId - The ID of the player making the move.
 * @param {object} action - The action object (e.g., { type: 'move', from: {r, c}, to: {r, c} }).
 * @returns {object} An object containing { success: bool, newState: object|null, reason: string|null, gameOver: bool, winnerId: string|null }.
 */
function processCheckersAction(currentState, playerId, action) {
    if (currentState.gameOver) {
        return { success: false, reason: "O jogo já terminou." };
    }
    if (playerId !== currentState.currentPlayerId) {
        return { success: false, reason: "Não é sua vez." };
    }
    if (action.type !== 'move' || !action.from || !action.to) {
        return { success: false, reason: "Ação inválida." };
    }

    const { from, to } = action;
    const { board, playerOrder, forcedJumps: currentForcedJumps } = currentState;
    const playerInfo = getPlayerInfo(playerId, playerOrder);
    const piece = getPieceAt(board, from.r, from.c);

    if (!piece || (piece !== playerInfo.man && piece !== playerInfo.king)) {
        return { success: false, reason: "Peça inválida selecionada." };
    }

    // Find possible moves/jumps for the selected piece
    const { moves, jumps } = findPossibleMovesForPiece(board, from.r, from.c, playerId, playerOrder);

    let isJump = false;
    let isValid = false;
    let capturedCoord = null;

    // Check if the move is a valid jump
    const validJump = jumps.find(j => j.to.r === to.r && j.to.c === to.c);
    if (validJump) {
        isJump = true;
        isValid = true;
        capturedCoord = validJump.captured;
    }

    // If not a jump, check if it's a valid simple move
    if (!isJump) {
        const validMove = moves.find(m => m.r === to.r && m.c === to.c);
        if (validMove) {
            isValid = true;
        }
    }

    // Enforce forced jumps
    if (currentForcedJumps) {
        if (!isJump) {
            return { success: false, reason: "Você deve realizar uma captura." };
        }
        // Check if the chosen jump is one of the forced ones
        const isForced = currentForcedJumps.some(fj => fj.from.r === from.r && fj.from.c === from.c && fj.to.r === to.r && fj.to.c === to.c);
        if (!isForced) {
            return { success: false, reason: "Você deve realizar uma das capturas obrigatórias." };
        }
    } else if (isJump) {
        // This case should technically not happen if findPossibleMovesForPiece is correct
        // (if a jump exists, it should be in currentForcedJumps), but added for safety.
        return { success: false, reason: "Erro inesperado: Captura encontrada, mas não era forçada?" };
    }

    if (!isValid) {
        return { success: false, reason: "Movimento inválido." };
    }

    // --- Apply Move --- 
    const newBoard = board.map(row => [...row]);
    let newPiece = piece;

    // Move piece
    newBoard[to.r][to.c] = piece;
    newBoard[from.r][from.c] = EMPTY;

    let capturedPieceType = null;
    if (isJump && capturedCoord) {
        capturedPieceType = getPieceAt(newBoard, capturedCoord.r, capturedCoord.c);
        newBoard[capturedCoord.r][capturedCoord.c] = EMPTY; // Remove captured piece
    }

    // Check for promotion
    if (newPiece === playerInfo.man && to.r === playerInfo.promotionRow) {
        newPiece = playerInfo.king;
        newBoard[to.r][to.c] = newPiece;
    }

    // --- Post-Move Checks --- 
    let nextPlayerId = currentState.currentPlayerId;
    let nextForcedJumps = null;
    let gameOver = false;
    let winnerId = null;
    let draw = false;
    let consecutiveNonCaptureMoves = currentState.consecutiveNonCaptureMoves;

    if (isJump) {
        consecutiveNonCaptureMoves = 0; // Reset counter on capture
        // Check for further jumps from the landing square (multi-jump)
        const { jumps: furtherJumps } = findPossibleMovesForPiece(newBoard, to.r, to.c, playerId, playerOrder);
        if (furtherJumps.length > 0) {
            // Player MUST continue jumping
            nextForcedJumps = furtherJumps.map(jump => ({ from: { r: to.r, c: to.c }, ...jump }));
            nextPlayerId = playerId; // Same player's turn
        } else {
            // Jump sequence finished, switch player
            nextPlayerId = playerOrder.find(id => id !== playerId);
            nextForcedJumps = findForcedJumps(newBoard, nextPlayerId, playerOrder);
        }
    } else {
        consecutiveNonCaptureMoves++; // Increment counter for non-capture move
        // Simple move finished, switch player
        nextPlayerId = playerOrder.find(id => id !== playerId);
        nextForcedJumps = findForcedJumps(newBoard, nextPlayerId, playerOrder);
    }

    // Check for win/draw conditions
    winnerId = checkWinCondition(newBoard, nextPlayerId, playerOrder);
    if (winnerId) {
        gameOver = true;
    } else {
        draw = checkDrawCondition(consecutiveNonCaptureMoves);
        if (draw) {
            gameOver = true;
            winnerId = null; // Indicate a draw
        }
    }

    // Update score
    const newScores = { ...currentState.scores };
    if (capturedPieceType) {
        newScores[playerId]++;
    }

    const newState = {
        ...currentState,
        board: newBoard,
        currentPlayerId: nextPlayerId,
        scores: newScores,
        forcedJumps: nextForcedJumps,
        lastMove: action,
        gameOver: gameOver,
        winnerId: winnerId,
        consecutiveNonCaptureMoves: consecutiveNonCaptureMoves,
    };

    return { success: true, newState: newState, gameOver: newState.gameOver, winnerId: newState.winnerId };
}

module.exports = {
    initializeCheckersState,
    processCheckersAction,
    // Export helpers if needed for UI (e.g., highlighting valid moves)
    findPossibleMovesForPiece,
    findForcedJumps,
    getPlayerInfo,
    // Export constants
    BOARD_SIZE,
    EMPTY,
    PLAYER1_MAN,
    PLAYER1_KING,
    PLAYER2_MAN,
    PLAYER2_KING
};

