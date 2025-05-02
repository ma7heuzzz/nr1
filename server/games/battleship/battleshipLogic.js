// /home/ubuntu/phase4_game/server/games/battleship/battleshipLogic.js

const BOARD_SIZE = 10;

// Cell states for guess grid
const GUESS_UNKNOWN = 0;
const GUESS_MISS = 1;
const GUESS_HIT = 2;

// Cell states for ship grid (player's own board)
const SHIP_EMPTY = 0;
const SHIP_PLACED = 1; // Part of a ship
const SHIP_HIT = 2;    // Part of a ship that was hit

// Standard ship types and lengths
const SHIPS = {
    carrier: { name: "Porta-aviões", length: 5 },
    battleship: { name: "Navio de Guerra", length: 4 },
    cruiser: { name: "Cruzador", length: 3 },
    submarine: { name: "Submarino", length: 3 },
    destroyer: { name: "Contratorpedeiro", length: 2 },
};
const SHIP_TYPES = Object.keys(SHIPS);

/**
 * Initializes the Battleship game state.
 * Players need to place their ships first.
 * @param {string[]} playerOrder - Array containing the IDs of the two players [player1Id, player2Id].
 * @returns {object} The initial game state.
 */
function initializeBattleshipState(playerOrder) {
    const createEmptyGrid = () => Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0));

    const initialPlayerState = (playerId) => ({
        playerId: playerId,
        shipGrid: createEmptyGrid(), // Represents their own ships (initially empty)
        guessGrid: createEmptyGrid(), // Represents their guesses on opponent's board
        shipsPlaced: {},
        shipsStatus: {},
        ready: false, // Becomes true when all ships are placed
    });

    const player1Id = playerOrder[0];
    const player2Id = playerOrder[1];

    return {
        gameType: 'battleship',
        playerOrder: playerOrder,
        currentPlayerId: null, // No current player during placement
        placementPhase: true,
        boards: {
            [player1Id]: initialPlayerState(player1Id),
            [player2Id]: initialPlayerState(player2Id),
        },
        winnerId: null,
        gameOver: false,
        scores: { [player1Id]: 0, [player2Id]: 0 }, // Score = opponent ships sunk
        lastAction: null,
    };
}

// --- Helper Functions ---

function isWithinBounds(r, c) {
    return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
}

/**
 * Checks if a ship placement is valid.
 * @param {Array<Array<number>>} shipGrid - The player's current ship grid.
 * @param {string} shipType - The type of ship being placed.
 * @param {number} r - Starting row.
 * @param {number} c - Starting column.
 * @param {string} orientation - 'horizontal' or 'vertical'.
 * @returns {{isValid: boolean, coords: Array<{r: number, c: number}>, reason: string|null}}
 */
function validatePlacement(shipGrid, shipType, r, c, orientation) {
    if (!SHIPS[shipType]) {
        return { isValid: false, coords: [], reason: "Tipo de navio inválido." };
    }
    const { length } = SHIPS[shipType];
    const coords = [];

    for (let i = 0; i < length; i++) {
        const currentR = orientation === 'vertical' ? r + i : r;
        const currentC = orientation === 'horizontal' ? c + i : c;

        if (!isWithinBounds(currentR, currentC)) {
            return { isValid: false, coords: [], reason: "Navio fora dos limites do tabuleiro." };
        }
        if (shipGrid[currentR][currentC] !== SHIP_EMPTY) {
            return { isValid: false, coords: [], reason: "Sobreposição de navios." };
        }
        coords.push({ r: currentR, c: currentC });
    }
    return { isValid: true, coords: coords, reason: null };
}

/**
 * Checks if a ship is sunk.
 * @param {Array<Array<number>>} opponentShipGrid - The opponent's ship grid.
 * @param {object} shipPlacement - The coordinates where the ship is placed.
 * @returns {boolean}
 */
function isShipSunk(opponentShipGrid, shipPlacement) {
    return shipPlacement.coords.every(({ r, c }) => opponentShipGrid[r][c] === SHIP_HIT);
}

/**
 * Processes a player's action in Battleship.
 * Actions can be 'placeShip' during placement phase or 'guess' during guessing phase.
 * @param {object} currentState - The current game state.
 * @param {string} playerId - The ID of the player making the action.
 * @param {object} action - The action object.
 *   - { type: 'placeShip', shipType: string, r: number, c: number, orientation: string }
 *   - { type: 'guess', r: number, c: number }
 * @returns {object} An object containing { success: bool, newState: object|null, reason: string|null, gameOver: bool, winnerId: string|null, feedback: object|null }.
 *         'feedback' can contain info about the guess result (hit/miss/sunk).
 */
function processBattleshipAction(currentState, playerId, action) {
    if (currentState.gameOver) {
        return { success: false, reason: "O jogo já terminou." };
    }

    const newState = JSON.parse(JSON.stringify(currentState)); // Deep copy
    const playerBoardState = newState.boards[playerId];
    const opponentId = newState.playerOrder.find(id => id !== playerId);
    const opponentBoardState = opponentId ? newState.boards[opponentId] : null;

    // --- Placement Phase --- 
    if (newState.placementPhase) {
        if (action.type !== 'placeShip') {
            return { success: false, reason: "Ação inválida durante a fase de posicionamento." };
        }
        if (playerBoardState.ready) {
            return { success: false, reason: "Você já posicionou todos os seus navios." };
        }
        const { shipType, r, c, orientation } = action;
        if (playerBoardState.shipsPlaced[shipType]) {
            return { success: false, reason: `Você já posicionou o ${SHIPS[shipType]?.name || shipType}.` };
        }

        const validation = validatePlacement(playerBoardState.shipGrid, shipType, r, c, orientation);
        if (!validation.isValid) {
            return { success: false, reason: validation.reason };
        }

        // Place the ship
        validation.coords.forEach(coord => {
            playerBoardState.shipGrid[coord.r][coord.c] = SHIP_PLACED;
        });
        playerBoardState.shipsPlaced[shipType] = { type: shipType, coords: validation.coords, hits: 0, sunk: false };
        playerBoardState.shipsStatus[shipType] = { hits: 0, sunk: false }; // Simplified status tracking

        // Check if player has placed all ships
        if (Object.keys(playerBoardState.shipsPlaced).length === SHIP_TYPES.length) {
            playerBoardState.ready = true;
        }

        // Check if both players are ready to start the guessing phase
        if (playerBoardState.ready && opponentBoardState?.ready) {
            newState.placementPhase = false;
            newState.currentPlayerId = newState.playerOrder[0]; // Player 1 starts guessing
        }

        newState.lastAction = { playerId, action };
        return { success: true, newState: newState, gameOver: false, winnerId: null, feedback: { placed: shipType } };
    }

    // --- Guessing Phase --- 
    else {
        if (playerId !== newState.currentPlayerId) {
            return { success: false, reason: "Não é sua vez." };
        }
        if (action.type !== 'guess') {
            return { success: false, reason: "Ação inválida durante a fase de adivinhação." };
        }
        const { r, c } = action;

        if (!isWithinBounds(r, c)) {
            return { success: false, reason: "Coordenadas fora do tabuleiro." };
        }
        if (playerBoardState.guessGrid[r][c] !== GUESS_UNKNOWN) {
            return { success: false, reason: "Você já atirou nesta coordenada." };
        }
        if (!opponentBoardState) {
             return { success: false, reason: "Oponente não encontrado." }; // Should not happen in a 2-player game
        }

        let feedback = { guess: { r, c } };
        const opponentShipAtCoord = opponentBoardState.shipGrid[r][c];

        if (opponentShipAtCoord === SHIP_PLACED || opponentShipAtCoord === SHIP_HIT) {
            // --- Hit --- 
            playerBoardState.guessGrid[r][c] = GUESS_HIT;
            opponentBoardState.shipGrid[r][c] = SHIP_HIT; // Mark hit on opponent's board
            feedback.result = 'hit';

            // Find which ship was hit and update its status
            let hitShipType = null;
            for (const type in opponentBoardState.shipsPlaced) {
                const ship = opponentBoardState.shipsPlaced[type];
                if (ship.coords.some(coord => coord.r === r && coord.c === c)) {
                    hitShipType = type;
                    ship.hits++;
                    opponentBoardState.shipsStatus[type].hits++;
                    // Check if the hit ship is now sunk
                    if (ship.hits === SHIPS[type].length) {
                        ship.sunk = true;
                        opponentBoardState.shipsStatus[type].sunk = true;
                        newState.scores[playerId]++; // Increment score (opponent ships sunk)
                        feedback.sunk = type;
                        feedback.sunkName = SHIPS[type].name;
                    }
                    break;
                }
            }

            // Check for win condition (all opponent ships sunk)
            const allOpponentShipsSunk = SHIP_TYPES.every(type => opponentBoardState.shipsStatus[type]?.sunk);
            if (allOpponentShipsSunk) {
                newState.gameOver = true;
                newState.winnerId = playerId;
            }

        } else {
            // --- Miss --- 
            playerBoardState.guessGrid[r][c] = GUESS_MISS;
            // No change needed on opponent's shipGrid for a miss
            feedback.result = 'miss';
        }

        // Switch turn if the game is not over
        if (!newState.gameOver) {
            newState.currentPlayerId = opponentId;
        }

        newState.lastAction = { playerId, action, feedback };
        return { success: true, newState: newState, gameOver: newState.gameOver, winnerId: newState.winnerId, feedback: feedback };
    }
}

module.exports = {
    initializeBattleshipState,
    processBattleshipAction,
    // Export constants if needed
    BOARD_SIZE,
    SHIPS,
    SHIP_TYPES,
    GUESS_UNKNOWN,
    GUESS_MISS,
    GUESS_HIT,
    SHIP_EMPTY,
    SHIP_PLACED,
    SHIP_HIT
};

