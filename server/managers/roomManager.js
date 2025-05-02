// server/managers/roomManager.js

const { v4: uuidv4 } = require("uuid");

// Import game logic modules
// const OldBoard = require("../games/nr1/board.js"); // No longer needed for core logic
const { initializeCheckersState, processCheckersAction } = require("../games/checkers/checkersLogic.js");
const { initializeBattleshipState, processBattleshipAction } = require("../games/battleship/battleshipLogic.js");
const { initializeBackgammonState, processBackgammonAction } = require("../games/backgammon/backgammonLogic.js");
const { initializeLudoState, processLudoAction } = require("../games/ludo/ludoLogic.js");

const MAX_PLAYERS_PER_ROOM = 2;
const DEFAULT_GAME_TYPE = "checkers"; // Default game if not specified
const ALLOWED_GAME_TYPES = ["checkers", "battleship", "backgammon", "ludo"]; // Allowed games
const FINISHED_ROOM_TIMEOUT_MS = 60000; // 60 seconds timeout for finished rooms
const INACTIVE_ROOM_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes timeout for inactive waiting/playing rooms

let rooms = {}; // { roomId: { id: ..., name: ..., players: { socketId: nickname }, playerOrder: [], playerCount: 0, maxPlayers: ..., status: ..., gameType: ..., gameState: {...}, finishTimeoutId: null, activityTimeoutId: null } }

// --- Room Lifecycle & Management ---

/**
 * Creates a new game room.
 * @param {string} creatorId - Socket ID of the creator.
 * @param {string} creatorNickname - Nickname of the creator.
 * @param {string} roomName - Optional name for the room.
 * @param {string} requestedGameType - The type of game requested.
 * @returns {object} The newly created room object.
 */
function createRoom(creatorId, creatorNickname, roomName, requestedGameType = DEFAULT_GAME_TYPE) {
    const roomId = uuidv4();
    const finalRoomName = roomName ? String(roomName).trim().substring(0, 20) : `Mesa de ${creatorNickname}`;

    // Validate game type
    const gameType = ALLOWED_GAME_TYPES.includes(requestedGameType) ? requestedGameType : DEFAULT_GAME_TYPE;

    const newRoom = {
        id: roomId,
        name: finalRoomName,
        players: { [creatorId]: creatorNickname },
        playerOrder: [creatorId],
        playerCount: 1,
        maxPlayers: MAX_PLAYERS_PER_ROOM, // Most games are 1v1
        status: "waiting", // waiting | placement | playing | finished
        gameType: gameType,
        gameState: null, // Will be initialized when game starts
        finishTimeoutId: null,
        activityTimeoutId: null, // Timeout for inactivity
    };
    rooms[roomId] = newRoom;
    resetActivityTimeout(roomId); // Start inactivity timer
    console.log(`RoomManager: Created room "${finalRoomName}" (${roomId}) by ${creatorNickname} for game ${gameType}`);
    return newRoom;
}

function getRoom(roomId) {
    return rooms[roomId];
}

function removeRoom(roomId) {
    const room = rooms[roomId];
    if (room) {
        console.log(`RoomManager: Removing room "${room.name}" (${roomId})`);
        clearTimeout(room.finishTimeoutId);
        clearTimeout(room.activityTimeoutId);
        delete rooms[roomId];
        return true;
    }
    return false;
}

function addPlayerToRoom(roomId, playerId, playerNickname) {
    const room = rooms[roomId];
    if (!room || room.status !== "waiting" || room.playerCount >= room.maxPlayers) {
        return { success: false, reason: !room ? "Mesa não encontrada." : room.status !== "waiting" ? "Mesa não está aguardando jogadores." : "Mesa cheia." };
    }

    room.players[playerId] = playerNickname;
    room.playerCount++;
    room.playerOrder.push(playerId);
    resetActivityTimeout(roomId); // Reset inactivity timer on activity
    console.log(`RoomManager: Added ${playerNickname} to room "${room.name}" (${roomId}). Players: ${room.playerCount}`);
    return { success: true, room };
}

function removePlayerFromRoom(roomId, playerId) {
    const room = rooms[roomId];
    if (!room || !room.players[playerId]) {
        console.warn(`RoomManager: Player ${playerId} not found in room ${roomId} for removal.`);
        return { roomExists: !!room, roomStatus: room?.status, playerCount: room?.playerCount };
    }

    const nickname = room.players[playerId];
    console.log(`RoomManager: Removing ${nickname || playerId} from room "${room.name}" (${roomId})`);

    delete room.players[playerId];
    room.playerCount--;
    room.playerOrder = room.playerOrder.filter(id => id !== playerId);

    // Reset activity timer if room still exists and isn't finished
    if (room.playerCount > 0 && room.status !== "finished") {
        resetActivityTimeout(roomId);
    }

    if (room.playerCount === 0) {
        console.log(`RoomManager: Room ${roomId} is empty, marking for removal.`);
        // Actual removal happens after this function returns, checking playerCount
    }

    return { roomExists: true, roomStatus: room.status, playerCount: room.playerCount, nickname: nickname || "Jogador Anônimo" };
}

/**
 * Gets a list of all tables (rooms) suitable for the lobby view.
 * Now includes tables in 'playing' status as requested.
 * @returns {Array<object>} List of table objects.
 */
function getLobbyTables() {
    const lobbyTables = Object.values(rooms)
        // Include waiting, placement, and playing rooms
        .filter(room => room.status === "waiting" || room.status === "playing" || room.status === "placement")
        .map(room => ({
            id: room.id,
            name: room.name,
            playerCount: room.playerCount,
            maxPlayers: room.maxPlayers,
            gameType: room.gameType,
            status: room.status, // waiting, placement, playing
            hasVacancy: room.status === "waiting" && room.playerCount < room.maxPlayers,
        }));

    // Sort: Waiting rooms with 1 vacancy first, then other waiting, then playing/placement, then alphabetically
    lobbyTables.sort((a, b) => {
        const aIsWaitingVacant = a.status === "waiting" && a.hasVacancy;
        const bIsWaitingVacant = b.status === "waiting" && b.hasVacancy;
        const aIsWaitingFull = a.status === "waiting" && !a.hasVacancy;
        const bIsWaitingFull = b.status === "waiting" && !b.hasVacancy;
        const aIsPlaying = a.status === "playing" || a.status === "placement";
        const bIsPlaying = b.status === "playing" || b.status === "placement";

        if (aIsWaitingVacant && !bIsWaitingVacant) return -1;
        if (!aIsWaitingVacant && bIsWaitingVacant) return 1;
        if (aIsWaitingFull && !bIsWaitingFull && !bIsWaitingVacant) return -1;
        if (!aIsWaitingFull && !aIsWaitingVacant && bIsWaitingFull) return 1;
        if (aIsPlaying && !bIsPlaying && !bIsWaitingFull && !bIsWaitingVacant) return 1; // Playing rooms after waiting rooms
        if (!aIsPlaying && !aIsWaitingFull && !aIsWaitingVacant && bIsPlaying) return -1;

        // Within the same status group, sort alphabetically by name
        return a.name.localeCompare(b.name);
    });
    return lobbyTables;
}

// --- Game State & Logic ---

/**
 * Starts the game in a room based on its gameType.
 * @param {string} roomId - The ID of the room.
 * @returns {object|null} The initial game state to send to clients, or null on failure.
 */
function startGameInRoom(roomId) {
    const room = rooms[roomId];
    if (!room || room.playerCount !== room.maxPlayers || room.status !== "waiting") {
        console.error(`RoomManager: Cannot start game in room ${roomId}. Conditions not met.`);
        return null;
    }

    console.log(`RoomManager: Starting game "${room.gameType}" in room "${room.name}" (${roomId})`);
    clearTimeout(room.activityTimeoutId); // Clear waiting timeout
    room.activityTimeoutId = null;

    let initialState = null;
    switch (room.gameType) {
        case "checkers":
            initialState = initializeCheckersState(room.playerOrder);
            room.status = "playing";
            break;
        case "battleship":
            initialState = initializeBattleshipState(room.playerOrder);
            room.status = "placement"; // Battleship starts with placement phase
            break;
        case "backgammon":
            initialState = initializeBackgammonState(room.playerOrder);
            // TODO: Backgammon needs initial roll to decide first player & status
            room.status = "playing"; // Or a specific initial roll status?
            break;
        case "ludo":
            initialState = initializeLudoState(room.playerOrder);
            room.status = "playing";
            break;
        default:
            console.error(`RoomManager: Unknown game type "${room.gameType}" for room ${roomId}. Cannot start game.`);
            // Revert status or handle error
            room.status = "waiting"; // Revert to waiting
            resetActivityTimeout(roomId); // Restart waiting timeout
            return null;
    }

    // Add the players map (ID -> nickname) to the initial state
    initialState.players = { ...room.players };
    // Add current player nickname for convenience (optional, client can derive)
    initialState.currentPlayerNickname = room.players[initialState.currentPlayerId];

    room.gameState = initialState;
    resetActivityTimeout(roomId); // Start playing/placement inactivity timer

    // Return the complete initial state including players map
    return initialState;
}

/**
 * Attempts to process a player action using the appropriate game logic.
 * @param {string} roomId - The ID of the room.
 * @param {string} playerId - The ID of the player performing the action.
 * @param {object} action - The action object from the client.
 * @returns {object} Result object { success: bool, reason: string|null, newState: object|null, gameOver: bool, winnerId: string|null, feedback: object|null }.
 */
function attemptPlayerAction(roomId, playerId, action) {
    const room = rooms[roomId];
    if (!room || (room.status !== "playing" && room.status !== "placement")) {
        return { success: false, reason: "Jogo não está em andamento ou em fase de posicionamento." };
    }
    if (!room.gameState) {
        console.error(`RoomManager: Missing gameState for active room ${roomId}`);
        return { success: false, reason: "Erro interno: Estado do jogo não encontrado." };
    }

    resetActivityTimeout(roomId); // Reset inactivity timer on action

    let result;
    switch (room.gameType) {
        case "checkers":
            result = processCheckersAction(room.gameState, playerId, action);
            break;
        case "battleship":
            result = processBattleshipAction(room.gameState, playerId, action);
            // If placement phase ended, update room status
            if (result.success && result.newState?.placementPhase === false && room.status === "placement") {
                room.status = "playing";
                console.log(`RoomManager: Battleship room ${roomId} transitioned to playing phase.`);
            }
            break;
        case "backgammon":
            result = processBackgammonAction(room.gameState, playerId, action);
            break;
        case "ludo":
            result = processLudoAction(room.gameState, playerId, action);
            break;
        default:
            return { success: false, reason: `Lógica para o jogo "${room.gameType}" não implementada.` };
    }

    // Update gameState if the action was successful and returned a new state
    if (result.success && result.newState) {
        room.gameState = result.newState;

        // Check if the game ended according to the game logic's result
        if (result.gameOver) {
            room.status = "finished";
            console.log(`RoomManager: Game over in room ${room.name} (${roomId}). Winner ID: ${result.winnerId}`);
            clearTimeout(room.activityTimeoutId); // Stop inactivity timer
            scheduleRoomCleanup(roomId); // Schedule cleanup for the finished room
        }
    }

    // Return the result from the game logic function
    // It contains success, newState (or null), gameOver, winnerId, reason, feedback
    return result;
}

/**
 * Handles logic when a player leaves a room, determining game outcome if necessary.
 * @param {string} roomId - The ID of the room.
 * @param {string} playerId - The ID of the player leaving.
 * @returns {object} - Result containing outcome, remaining player ID, etc.
 */
function handlePlayerLeave(roomId, playerId) {
    const room = rooms[roomId];
    if (!room || !room.players[playerId]) {
        return { outcome: "no_change", reason: "Player or room not found." };
    }

    const nickname = room.players[playerId];
    const wasPlaying = room.status === "playing" || room.status === "placement";
    const wasFinished = room.status === "finished";

    let outcome = "player_left";
    let reason = `${nickname || "Jogador Anônimo"} saiu.`;
    let gameOverData = null;
    let remainingPlayerId = null;

    // If the game was already finished, the score stands.
    if (wasFinished) {
        console.log(`RoomManager: Player ${nickname} left finished game ${roomId}.`);
        outcome = "player_left_finished";
    }
    // If the game was playing/placement and had 2 players, the remaining player wins by default.
    else if (wasPlaying && room.playerCount === 2) {
        remainingPlayerId = room.playerOrder.find(id => id !== playerId);
        if (remainingPlayerId) {
            room.status = "finished"; // Mark room as finished due to leave
            const winnerNickname = room.players[remainingPlayerId];
            console.log(`RoomManager: Game ${roomId} ended by player leave. Winner: ${winnerNickname}`);
            outcome = "opponent_left_game_over";
            reason = `${nickname || "Oponente"} desconectou.`;
            // Use game state scores if available, otherwise default
            const finalScores = room.gameState?.scores || { [remainingPlayerId]: 1, [playerId]: 0 };
            gameOverData = {
                winnerId: remainingPlayerId, // Explicitly set winnerId
                winnerNickname: winnerNickname,
                scores: { ...finalScores },
                reason: reason
            };
            clearTimeout(room.activityTimeoutId); // Stop inactivity timer
            scheduleRoomCleanup(roomId); // Schedule cleanup
        }
    }

    // Remove player from room data (happens regardless of outcome)
    const removeResult = removePlayerFromRoom(roomId, playerId);

    // If the room becomes empty, mark for deletion
    const shouldDeleteRoom = removeResult.playerCount === 0;

    // If the room wasn't finished before, and didn't become finished due to the leave,
    // and still has players, set it back to waiting (unless it's a game type that can continue? Unlikely for 1v1)
    if (!wasFinished && outcome !== "opponent_left_game_over" && removeResult.playerCount > 0) {
        if (room.status !== "waiting") {
             console.log(`RoomManager: Room ${roomId} reverting to waiting status due to player leave.`);
             room.status = "waiting";
             room.gameState = null; // Clear game state
             room.playerOrder = room.playerOrder.filter(id => room.players[id]); // Update player order
             resetActivityTimeout(roomId); // Restart waiting timeout
        }
    }

    return {
        outcome: outcome,
        reason: reason,
        gameOverData: gameOverData,
        remainingPlayerId: remainingPlayerId,
        remainingPlayerIds: Object.keys(room.players), // Pass remaining player IDs
        nickname: nickname || "Jogador Anônimo",
        shouldDeleteRoom: shouldDeleteRoom,
    };
}

// --- Timeout Handling ---

/**
 * Schedules the cleanup of a finished room after a delay.
 * @param {string} roomId - The ID of the room to clean up.
 */
function scheduleRoomCleanup(roomId) {
    const room = rooms[roomId];
    if (!room || room.status !== "finished") return;

    // Clear any existing finish timeout for this room
    clearTimeout(room.finishTimeoutId);

    console.log(`RoomManager: Scheduling cleanup for finished room ${roomId} in ${FINISHED_ROOM_TIMEOUT_MS / 1000}s`);
    room.finishTimeoutId = setTimeout(() => {
        console.log(`RoomManager: Cleaning up finished room ${roomId}`);
        removeRoom(roomId);
        // Notify lobby? Maybe not necessary if it was already removed by status change.
    }, FINISHED_ROOM_TIMEOUT_MS);
}

/**
 * Resets the inactivity timeout for a room.
 * @param {string} roomId - The ID of the room.
 */
function resetActivityTimeout(roomId) {
    const room = rooms[roomId];
    if (!room || room.status === "finished") return; // Don't time out finished rooms here

    clearTimeout(room.activityTimeoutId);

    // console.log(`RoomManager: Resetting activity timeout for room ${roomId} (${room.status})`);
    room.activityTimeoutId = setTimeout(() => {
        handleRoomInactivity(roomId);
    }, INACTIVE_ROOM_TIMEOUT_MS);
}

/**
 * Handles room inactivity timeout.
 * @param {string} roomId - The ID of the room that timed out.
 */
function handleRoomInactivity(roomId) {
    const room = rooms[roomId];
    if (!room || room.status === "finished") return; // Should not happen, but check anyway

    console.log(`RoomManager: Room ${roomId} ("${room.name}") timed out due to inactivity (${room.status}).`);

    // Use global callback provided by socketHandlers.js to notify players
    if (global.onRoomTimeout) {
        global.onRoomTimeout(roomId, room.name, Object.keys(room.players));
    }

    // Remove the room immediately after notifying
    removeRoom(roomId);
    // Notify lobby? Socket handler should do this after receiving the timeout event.
}


module.exports = {
    createRoom,
    getRoom,
    removeRoom,
    addPlayerToRoom,
    handlePlayerLeave, // Keep handlePlayerLeave, removePlayerFromRoom is internal
    getLobbyTables,
    startGameInRoom,
    attemptPlayerAction,
};

