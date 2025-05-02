// server/managers/playerManager.js

let players = {}; // { socketId: { nickname: null, currentRoomId: null } }

function addPlayer(socketId) {
    if (!players[socketId]) {
        players[socketId] = { nickname: null, currentRoomId: null };
        console.log(`PlayerManager: Added player ${socketId}. Total: ${Object.keys(players).length}`);
        return true;
    }
    return false;
}

function removePlayer(socketId) {
    if (players[socketId]) {
        const nickname = players[socketId].nickname;
        delete players[socketId];
        console.log(`PlayerManager: Removed player ${nickname || socketId}. Total: ${Object.keys(players).length}`);
        return true;
    }
    return false;
}

function setPlayerNickname(socketId, nickname) {
    if (players[socketId]) {
        // Basic validation (can be expanded)
        const trimmedNickname = nickname ? String(nickname).trim() : "";
        if (!trimmedNickname) {
            return { success: false, reason: "Apelido não pode estar vazio." };
        }
        if (trimmedNickname.length > 15) {
            return { success: false, reason: "Apelido muito longo (máx 15 caracteres)." };
        }
        // TODO: Add check for nickname uniqueness across all players if desired
        // const isUnique = Object.values(players).every(p => p.nickname !== trimmedNickname || p === players[socketId]);
        // if (!isUnique) {
        //     return { success: false, reason: "Este apelido já está em uso." };
        // }

        players[socketId].nickname = trimmedNickname;
        console.log(`PlayerManager: Nickname for ${socketId} set to ${trimmedNickname}`);
        return { success: true, nickname: trimmedNickname };
    } else {
        return { success: false, reason: "Jogador não encontrado." };
    }
}

function getPlayer(socketId) {
    return players[socketId];
}

function getPlayerNickname(socketId) {
    return players[socketId]?.nickname;
}

function setPlayerRoom(socketId, roomId) {
    if (players[socketId]) {
        players[socketId].currentRoomId = roomId;
        console.log(`PlayerManager: Player ${players[socketId].nickname || socketId} assigned to room ${roomId}`);
    } else {
        console.warn(`PlayerManager: Tried to set room for non-existent player ${socketId}`);
    }
}

function getPlayerRoomId(socketId) {
    return players[socketId]?.currentRoomId;
}

function getPlayersInLobby() {
    return Object.entries(players)
        .filter(([socketId, player]) => !player.currentRoomId)
        .map(([socketId, player]) => socketId);
}

module.exports = {
    addPlayer,
    removePlayer,
    setPlayerNickname,
    getPlayer,
    getPlayerNickname,
    setPlayerRoom,
    getPlayerRoomId,
    getPlayersInLobby,
    // Expose players object directly ONLY if absolutely necessary elsewhere (try to avoid)
    // _internal_getPlayersObject: () => players
};

