// /home/ubuntu/phase4_game/server/games/backgammon/backgammonLogic.js

// Constants
const NUM_POINTS = 24;
const CHECKERS_PER_PLAYER = 15;

// Point indices (0-23 for board points, 24 for P1 bar, 25 for P2 bar, -1 for P1 off, 26 for P2 off)
const P1_BAR = 24;
const P2_BAR = 25;
const P1_OFF = -1; // Player 1 bears off towards point 0
const P2_OFF = 26; // Player 2 bears off towards point 23

// Player representation (consistent with other games)
const PLAYER1 = 0;
const PLAYER2 = 1;

/**
 * Initializes the Backgammon game state.
 * @param {string[]} playerOrder - Array containing the IDs of the two players [player1Id, player2Id].
 * @returns {object} The initial game state.
 */
function initializeBackgammonState(playerOrder) {
    const points = Array(NUM_POINTS).fill(null).map(() => ({ player: null, count: 0 }));

    // Standard Backgammon setup
    // Player 1 (White/Red - moves counter-clockwise from 23 towards 0)
    points[23] = { player: PLAYER1, count: 2 };
    points[12] = { player: PLAYER1, count: 5 };
    points[7] = { player: PLAYER1, count: 3 };
    points[5] = { player: PLAYER1, count: 5 };

    // Player 2 (Black/Blue - moves clockwise from 0 towards 23)
    points[0] = { player: PLAYER2, count: 2 };
    points[11] = { player: PLAYER2, count: 5 };
    points[16] = { player: PLAYER2, count: 3 };
    points[18] = { player: PLAYER2, count: 5 };

    const initialPlayerState = (playerIndex) => ({
        checkersOnBar: 0,
        checkersOff: 0,
        playerId: playerOrder[playerIndex]
    });

    return {
        gameType: "backgammon",
        playerOrder: playerOrder,
        points: points, // Array representing the 24 points
        players: {
            [PLAYER1]: initialPlayerState(PLAYER1),
            [PLAYER2]: initialPlayerState(PLAYER2),
        },
        // Game flow state
        currentPlayerIndex: null, // Determined by initial dice roll
        dice: [0, 0], // Current dice roll values
        movesRemaining: [], // Possible moves based on dice roll
        turnPhase: "roll", // roll | move
        // Win/Loss state
        winnerId: null,
        gameOver: false,
        // Optional: Doubling cube state
        doublingCube: {
            value: 1,
            owner: null, // null | PLAYER1 | PLAYER2 | "center"
            offered: false,
        },
        lastAction: null,
    };
    // TODO: Implement initial dice roll to determine first player
}

// --- Helper Functions (Placeholders - Need Implementation) ---

function rollDice() {
    return [
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1
    ];
}

/**
 * Finds all valid moves for the current player based on the dice roll.
 * @param {object} gameState - The current game state.
 * @returns {Array<object>} A list of possible moves or sequences of moves.
 */
function findValidMoves(gameState) {
    // TODO: Implement complex move generation logic
    // - Consider checkers on the bar
    // - Consider dice values (doubles)
    // - Consider blocked points
    // - Consider bearing off rules
    // - Return individual moves or sequences if multiple dice are used
    return []; // Placeholder
}

/**
 * Applies a chosen move to the game state.
 * @param {object} gameState - The current game state.
 * @param {object} move - The move to apply (e.g., { from: pointIndex, dieValue: number }).
 * @returns {object} The updated game state after the move.
 */
function applyMove(gameState, move) {
    // TODO: Implement logic to update board state
    // - Move checker from 'from' point
    // - Handle hitting opponent's blot
    // - Handle bearing off
    // - Update movesRemaining
    return gameState; // Placeholder
}

/**
 * Checks if the game is over (one player has borne off all checkers).
 * @param {object} gameState - The current game state.
 * @returns {string | null} The ID of the winner, or null if not over.
 */
function checkWinCondition(gameState) {
    if (gameState.players[PLAYER1].checkersOff === CHECKERS_PER_PLAYER) {
        return gameState.playerOrder[PLAYER1];
    }
    if (gameState.players[PLAYER2].checkersOff === CHECKERS_PER_PLAYER) {
        return gameState.playerOrder[PLAYER2];
    }
    return null;
}

/**
 * Processes a player's action in Backgammon.
 * Actions: 'rollDice', 'moveChecker', 'offerDouble', 'acceptDouble', 'rejectDouble'
 * @param {object} currentState - The current game state.
 * @param {string} playerId - The ID of the player making the action.
 * @param {object} action - The action object.
 *   - { type: 'rollDice' }
 *   - { type: 'moveChecker', moves: [{ from: number, dieValue: number, to: number }] } // Sequence of moves for the turn
 *   - { type: 'offerDouble' }
 *   - { type: 'acceptDouble' }
 *   - { type: 'rejectDouble' }
 * @returns {object} An object containing { success: bool, newState: object|null, reason: string|null, gameOver: bool, winnerId: string|null, feedback: object|null }.
 */
function processBackgammonAction(currentState, playerId, action) {
    if (currentState.gameOver) {
        return { success: false, reason: "O jogo já terminou." };
    }

    const playerIndex = currentState.playerOrder.indexOf(playerId);
    if (playerIndex === -1) {
        return { success: false, reason: "Jogador inválido." };
    }

    // TODO: Implement full action processing logic based on turnPhase and action type
    // - Validate player turn
    // - Handle dice rolling
    // - Validate moves based on dice and board state
    // - Apply valid moves
    // - Handle doubling cube actions
    // - Check for win condition after moves
    // - Switch turns

    let newState = JSON.parse(JSON.stringify(currentState)); // Deep copy
    let success = false;
    let reason = "Ação não implementada.";
    let gameOver = false;
    let winnerId = null;
    let feedback = null;

    // --- Placeholder Logic --- 
    if (action.type === 'rollDice') {
        if (newState.turnPhase !== 'roll' || playerIndex !== newState.currentPlayerIndex) {
            reason = "Não é hora de rolar os dados ou não é sua vez.";
        } else {
            newState.dice = rollDice();
            newState.movesRemaining = []; // TODO: Calculate moves based on dice
            // TODO: Check if player has any valid moves. If not, switch turn immediately.
            newState.turnPhase = 'move';
            success = true;
            reason = null;
            feedback = { dice: newState.dice };
        }
    } else if (action.type === 'moveChecker') {
        if (newState.turnPhase !== 'move' || playerIndex !== newState.currentPlayerIndex) {
            reason = "Não é hora de mover ou não é sua vez.";
        } else {
            // TODO: Validate the sequence of moves in action.moves against newState.movesRemaining
            // TODO: Apply the sequence of moves using applyMove helper
            // TODO: If all moves are used or no more valid moves exist, switch turn
            // newState.currentPlayerIndex = (newState.currentPlayerIndex + 1) % 2;
            // newState.turnPhase = 'roll';
            // newState.dice = [0, 0];
            // newState.movesRemaining = [];
            reason = "Lógica de movimento não implementada."; // Placeholder
        }
    }

    // Check win condition after potential moves
    winnerId = checkWinCondition(newState);
    if (winnerId) {
        gameOver = true;
        newState.gameOver = true;
        newState.winnerId = winnerId;
    }

    newState.lastAction = { playerId, action, timestamp: Date.now() };

    return {
        success: success,
        newState: success ? newState : null,
        reason: reason,
        gameOver: gameOver,
        winnerId: winnerId,
        feedback: feedback
    };
}

module.exports = {
    initializeBackgammonState,
    processBackgammonAction,
    // Export constants if needed
    NUM_POINTS,
    CHECKERS_PER_PLAYER,
    P1_BAR,
    P2_BAR,
    P1_OFF,
    P2_OFF,
    PLAYER1,
    PLAYER2
};

