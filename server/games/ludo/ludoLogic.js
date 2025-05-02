// /home/ubuntu/phase4_game/server/games/ludo/ludoLogic.js

// Constants
const NUM_PLAYERS = 2; // Sticking to 2 players for now, matching room structure
const PIECES_PER_PLAYER = 4;
const TRACK_LENGTH = 52; // Standard Ludo track length
const HOME_COLUMN_LENGTH = 6;
const START_ROLL = 6; // Value needed to move a piece out of the yard

// Piece States/Locations
const YARD = -1;
const HOME = -2;
// Track positions 0 to TRACK_LENGTH - 1
// Home column positions 100+ for P1, 200+ for P2, etc.

// Player representation (consistent with other games)
const PLAYER1 = 0;
const PLAYER2 = 1;

// Define player-specific paths and start/end points
const PLAYER_INFO = {
    [PLAYER1]: {
        startSquare: 0, // Example: Player 1 starts at track position 0
        entrySquare: TRACK_LENGTH - 1, // Square before home column
        homeColumnBase: 100, // e.g., Home squares 100-105
        color: "red" // Example color
    },
    [PLAYER2]: {
        startSquare: Math.floor(TRACK_LENGTH / 2), // Example: Player 2 starts halfway
        entrySquare: Math.floor(TRACK_LENGTH / 2) - 1,
        homeColumnBase: 200,
        color: "blue"
    },
    // Add PLAYER3, PLAYER4 if extending later
};

/**
 * Initializes the Ludo game state for 2 players.
 * @param {string[]} playerOrder - Array containing the IDs of the two players [player1Id, player2Id].
 * @returns {object} The initial game state.
 */
function initializeLudoState(playerOrder) {

    const initialPlayerPieces = () => Array(PIECES_PER_PLAYER).fill(YARD); // All pieces start in the yard

    return {
        gameType: "ludo",
        playerOrder: playerOrder,
        pieces: {
            [PLAYER1]: initialPlayerPieces(),
            [PLAYER2]: initialPlayerPieces(),
        },
        // Game flow state
        currentPlayerIndex: PLAYER1, // Player 1 starts
        diceValue: null, // Current dice roll value
        turnPhase: "roll", // roll | move
        mustMovePiece: null, // Index of the piece that must be moved (e.g., after rolling 6 with pieces in yard)
        // Win/Loss state
        winnerId: null,
        gameOver: false,
        scores: { [playerOrder[0]]: 0, [playerOrder[1]]: 0 }, // Score = pieces HOME
        lastAction: null,
    };
}

// --- Helper Functions (Placeholders - Need Implementation) ---

function rollDie() {
    return Math.floor(Math.random() * 6) + 1;
}

/**
 * Calculates the destination square for a piece given a dice roll.
 * @param {number} currentPos - Current position (YARD, HOME, track index, home column index).
 * @param {number} diceValue - The value rolled.
 * @param {number} playerIndex - The index of the player (PLAYER1 or PLAYER2).
 * @returns {number | null} The destination position, or null if move is invalid/blocked.
 */
function calculateDestination(currentPos, diceValue, playerIndex, gameState) {
    // TODO: Implement move calculation
    // - Handle moving out of yard on START_ROLL
    // - Handle moving along the track (wrapping around)
    // - Handle entering the home column
    // - Handle moving within the home column
    // - Handle exact roll needed for HOME
    // - Check for blocking pieces (opponent or own)
    return null; // Placeholder
}

/**
 * Checks if a square is safe (usually marked, prevents pieces from being sent back).
 * @param {number} trackPos - The position on the main track.
 * @returns {boolean}
 */
function isSafeSquare(trackPos) {
    // TODO: Define safe squares based on standard Ludo rules
    // Example: Start squares and squares marked with a star
    const safeSquares = [PLAYER_INFO[PLAYER1].startSquare, PLAYER_INFO[PLAYER2].startSquare /*, ... other safe squares */];
    return safeSquares.includes(trackPos);
}

/**
 * Sends an opponent's piece back to their yard.
 * @param {number} landingPos - The track position where the current player landed.
 * @param {number} currentPlayerIndex - The index of the current player.
 * @param {object} gameState - The current game state.
 * @returns {object} The updated gameState.
 */
function sendOpponentHome(landingPos, currentPlayerIndex, gameState) {
    // TODO: Implement logic to check for opponent piece on landing square
    // - Ensure it's not a safe square
    // - Ensure it's a single opponent piece (not a block)
    // - Update opponent's piece position to YARD
    return gameState; // Placeholder
}

/**
 * Checks if the game is over (one player has moved all pieces HOME).
 * @param {object} gameState - The current game state.
 * @returns {string | null} The ID of the winner, or null if not over.
 */
function checkWinCondition(gameState) {
    for (let i = 0; i < NUM_PLAYERS; i++) {
        if (gameState.pieces[i].every(pos => pos === HOME)) {
            return gameState.playerOrder[i];
        }
    }
    return null;
}

/**
 * Processes a player's action in Ludo.
 * Actions: 'rollDie', 'movePiece'
 * @param {object} currentState - The current game state.
 * @param {string} playerId - The ID of the player making the action.
 * @param {object} action - The action object.
 *   - { type: 'rollDie' }
 *   - { type: 'movePiece', pieceIndex: number }
 * @returns {object} An object containing { success: bool, newState: object|null, reason: string|null, gameOver: bool, winnerId: string|null, feedback: object|null }.
 */
function processLudoAction(currentState, playerId, action) {
    if (currentState.gameOver) {
        return { success: false, reason: "O jogo já terminou." };
    }

    const playerIndex = currentState.playerOrder.indexOf(playerId);
    if (playerIndex === -1 || playerIndex !== currentState.currentPlayerIndex) {
        return { success: false, reason: "Jogador inválido ou não é sua vez." };
    }

    let newState = JSON.parse(JSON.stringify(currentState)); // Deep copy
    let success = false;
    let reason = "Ação não implementada.";
    let gameOver = false;
    let winnerId = null;
    let feedback = null;
    let switchTurn = true;

    // --- Action Processing --- 
    if (action.type === 'rollDie') {
        if (newState.turnPhase !== 'roll') {
            reason = "Não é hora de rolar o dado.";
        } else {
            newState.diceValue = rollDie();
            feedback = { dice: newState.diceValue };

            // TODO: Check if player *can* move any piece with this roll
            // - Check pieces in yard (needs START_ROLL?)
            // - Check pieces on track/home column
            const canMove = true; // Placeholder - Implement actual check

            if (canMove) {
                newState.turnPhase = 'move';
                // TODO: If only one piece can move, set newState.mustMovePiece
                success = true;
                reason = null;
                switchTurn = false; // Player needs to move
            } else {
                // No valid moves, turn ends immediately
                success = true;
                reason = "Nenhum movimento possível com este dado.";
                newState.turnPhase = 'roll'; // Next player will roll
                newState.diceValue = null;
                // switchTurn remains true
            }
        }
    } else if (action.type === 'movePiece') {
        if (newState.turnPhase !== 'move') {
            reason = "Role o dado primeiro.";
        } else if (newState.mustMovePiece !== null && action.pieceIndex !== newState.mustMovePiece) {
            reason = "Você deve mover a peça indicada.";
        } else {
            const pieceIndex = action.pieceIndex;
            if (pieceIndex < 0 || pieceIndex >= PIECES_PER_PLAYER) {
                reason = "Índice de peça inválido.";
            } else {
                const currentPos = newState.pieces[playerIndex][pieceIndex];
                const destination = calculateDestination(currentPos, newState.diceValue, playerIndex, newState);

                if (destination === null) {
                    reason = "Movimento inválido para esta peça.";
                } else {
                    // --- Apply Move --- 
                    newState.pieces[playerIndex][pieceIndex] = destination;

                    // TODO: Handle sending opponent home if applicable
                    // newState = sendOpponentHome(destination, playerIndex, newState);

                    // Update score if piece reached HOME
                    if (destination === HOME) {
                        newState.scores[playerId]++;
                    }

                    // Check for win condition
                    winnerId = checkWinCondition(newState);
                    if (winnerId) {
                        gameOver = true;
                    } else {
                        // Determine if player gets another turn (roll 6 or piece reached home)
                        if (newState.diceValue === START_ROLL || destination === HOME) {
                            switchTurn = false; // Player rolls again
                            newState.turnPhase = 'roll';
                            newState.diceValue = null;
                        } else {
                            switchTurn = true; // Next player's turn
                            newState.turnPhase = 'roll';
                            newState.diceValue = null;
                        }
                    }
                    success = true;
                    reason = null;
                    feedback = { movedPiece: pieceIndex, from: currentPos, to: destination };
                }
            }
        }
    }

    // --- Switch Turn if necessary --- 
    if (success && switchTurn && !gameOver) {
        newState.currentPlayerIndex = (newState.currentPlayerIndex + 1) % NUM_PLAYERS;
        newState.turnPhase = 'roll';
        newState.diceValue = null;
        newState.mustMovePiece = null;
    } else if (success && !switchTurn && !gameOver) {
        // Player plays again, reset phase/dice
        newState.turnPhase = 'roll';
        newState.diceValue = null;
        newState.mustMovePiece = null;
    }

    if (gameOver) {
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
    initializeLudoState,
    processLudoAction,
    // Export constants if needed
    PIECES_PER_PLAYER,
    TRACK_LENGTH,
    HOME_COLUMN_LENGTH,
    YARD,
    HOME,
    PLAYER_INFO
};

