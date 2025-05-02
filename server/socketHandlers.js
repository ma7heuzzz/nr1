// server/socketHandlers.js

const playerManager = require("./managers/playerManager.js");
const roomManager = require("./managers/roomManager.js");

// Basic rate limiting state
const chatRateLimit = new Map(); // socket.id -> { count: number, lastMessageTime: number }
const CHAT_LIMIT_INTERVAL = 5000; // 5 seconds
const CHAT_LIMIT_COUNT = 5; // Max 5 messages per interval

function initializeSocketHandlers(io) {

    // Global callback for room timeouts (set by roomManager)
    global.onRoomTimeout = (roomId, roomName, playerIds) => {
        console.log(`SocketHandlers: Handling timeout for room ${roomName} (${roomId})`);
        playerIds.forEach(socketId => {
            const playerSocket = io.sockets.sockets.get(socketId);
            if (playerSocket) {
                playerSocket.emit("forceMainMenu", { reason: `A sala "${roomName}" foi fechada por inatividade.` });
                // Ensure player state is updated even if leave event doesn't fire immediately
                playerManager.setPlayerRoom(socketId, null);
                playerSocket.leave(roomId); // Force leave the socket room
            }
        });
        // Lobby update is implicitly handled as the room no longer exists in roomManager
        broadcastLobbyUpdate(io);
    };

    io.on("connection", (socket) => {
        console.log("SocketHandlers: User connected:", socket.id);
        playerManager.addPlayer(socket.id);

        // --- Nickname Handling ---
        socket.on("setNickname", (data) => {
            const result = playerManager.setPlayerNickname(socket.id, data.nickname);
            if (result.success) {
                socket.emit("nicknameAccepted", { nickname: result.nickname });
            } else {
                socket.emit("nicknameRejected", { reason: result.reason });
            }
        });

        // --- Lobby and Room Management ---
        socket.on("listTables", () => {
            if (!playerManager.getPlayerNickname(socket.id)) return; // Must have nickname
            console.log(`SocketHandlers: Player ${playerManager.getPlayerNickname(socket.id)} requested table list.`);
            socket.emit("tableListUpdate", roomManager.getLobbyTables());
        });

        socket.on("createTable", (data) => {
            const player = playerManager.getPlayer(socket.id);
            if (!player?.nickname) {
                return socket.emit("tableCreationFailed", { reason: "Defina um apelido primeiro." });
            }
            if (player.currentRoomId) {
                return socket.emit("tableCreationFailed", { reason: "Você já está em uma mesa." });
            }

            // Pass gameType from client data
            const newRoom = roomManager.createRoom(socket.id, player.nickname, data.tableName, data.gameType);
            playerManager.setPlayerRoom(socket.id, newRoom.id);

            socket.join(newRoom.id);
            // Include gameType in the response
            socket.emit("tableCreated", { tableId: newRoom.id, tableName: newRoom.name, players: newRoom.players, gameType: newRoom.gameType });

            broadcastLobbyUpdate(io);
        });

        socket.on("joinTable", (data) => {
            const player = playerManager.getPlayer(socket.id);
            const tableId = data.tableId;

            if (!player?.nickname) {
                return socket.emit("joinTableFailed", { reason: "Defina um apelido primeiro." });
            }
            if (player.currentRoomId) {
                return socket.emit("joinTableFailed", { reason: "Você já está em uma mesa." });
            }
            if (!tableId) {
                return socket.emit("joinTableFailed", { reason: "ID da mesa inválido." });
            }

            const joinResult = roomManager.addPlayerToRoom(tableId, socket.id, player.nickname);

            if (!joinResult.success) {
                return socket.emit("joinTableFailed", { reason: joinResult.reason });
            }

            const room = joinResult.room;
            playerManager.setPlayerRoom(socket.id, tableId);

            socket.join(tableId);
            // Include boardSize in the response
            socket.emit("joinedTable", { tableId: room.id, tableName: room.name, players: room.players, boardSize: room.boardSize });

            // Notify existing players about the new player (for UI/state updates, not voice specifically)
            const existingPlayerIds = Object.keys(room.players).filter(id => id !== socket.id);
            existingPlayerIds.forEach(existingPlayerId => {
                const existingSocket = io.sockets.sockets.get(existingPlayerId);
                if (existingSocket) {
                    // Tell existing player about the new player
                    existingSocket.emit("playerJoined", { id: socket.id, nickname: player.nickname });
                    // Tell the new player about the existing player (handled by joinedTable response)
                }
            });

            // Check if game should start
            if (room.playerCount === room.maxPlayers) {
                const gameState = roomManager.startGameInRoom(tableId);
                if (gameState) {
                    io.to(tableId).emit("gameStart", gameState);
                    broadcastLobbyUpdate(io); // Room is no longer waiting
                }
            } else {
                 broadcastLobbyUpdate(io); // Player count changed
            }
        });

        socket.on("leaveTable", () => {
            handleLeave(socket, io);
        });

        // --- Game Actions ---
        socket.on("playerAction", (action) => {
            const player = playerManager.getPlayer(socket.id);
            if (!player || !player.currentRoomId) return;

            const roomId = player.currentRoomId;
            const actionResult = roomManager.attemptPlayerAction(roomId, socket.id, action);

            if (!actionResult.success) {
                console.warn(`SocketHandlers: Invalid action from ${player.nickname}: ${actionResult.reason}`);
                socket.emit("invalidMove", { reason: actionResult.reason });
                return;
            }

            if (actionResult.gameOver) {
                console.log(`SocketHandlers: Game over in room ${roomId}. Winner: ${actionResult.winnerNickname}`);
                io.to(roomId).emit("gameOver", {
                    winnerId: actionResult.winnerId, // Make sure winnerId is included
                    winnerNickname: actionResult.winnerNickname,
                    scores: actionResult.scores,
                    reason: actionResult.reason // Pass reason if game ended unexpectedly
                });
                // Cleanup is scheduled by roomManager
            } else {
                // Send state update to the room
                io.to(roomId).emit("gameStateUpdate", actionResult.newState);
            }
        });

        // --- Chat Handling ---
        socket.on("chatMessage", (data) => {
            const player = playerManager.getPlayer(socket.id);
            if (!player || !player.currentRoomId || !player.nickname) {
                return socket.emit("chatError", { reason: "Não é possível enviar mensagem." });
            }

            const message = data.message?.trim();
            if (!message || message.length === 0) {
                return socket.emit("chatError", { reason: "Mensagem vazia." });
            }
            if (message.length > 100) {
                return socket.emit("chatError", { reason: "Mensagem muito longa (máx 100 caracteres)." });
            }

            // Basic Rate Limiting
            const now = Date.now();
            const limitData = chatRateLimit.get(socket.id) || { count: 0, lastMessageTime: 0 };

            if (now - limitData.lastMessageTime < CHAT_LIMIT_INTERVAL) {
                if (limitData.count >= CHAT_LIMIT_COUNT) {
                    console.warn(`SocketHandlers: Chat rate limit exceeded for ${player.nickname}`);
                    return socket.emit("chatError", { reason: "Você está enviando mensagens muito rápido!" });
                }
                limitData.count++;
            } else {
                limitData.count = 1;
                limitData.lastMessageTime = now;
            }
            chatRateLimit.set(socket.id, limitData);

            const roomId = player.currentRoomId;
            console.log(`SocketHandlers: Chat message from ${player.nickname} in room ${roomId}: ${message}`);
            io.to(roomId).emit("chatMessage", {
                senderId: socket.id,
                senderNickname: player.nickname,
                message: message
            });
        });

        // --- WebRTC Signaling Handling (Aligned with Client: voiceChatManager.js) ---
        socket.on("voiceSignal", (data) => {
            const player = playerManager.getPlayer(socket.id);
            // Ensure player exists and has a target ID
            if (!player || !player.currentRoomId || !data.targetId) return;

            const targetSocket = io.sockets.sockets.get(data.targetId);
            if (targetSocket) {
                console.log(`SocketHandlers: Relaying voice signal from ${socket.id} to ${data.targetId}`);
                // Emit with the event name the client expects: "voiceSignal"
                // Include sender's ID so the recipient knows who sent the signal
                targetSocket.emit("voiceSignal", {
                    senderId: socket.id,
                    signal: data.signal
                });
            } else {
                console.warn(`SocketHandlers: Could not find target socket ${data.targetId} to relay signal from ${socket.id}`);
            }
        });

        // --- Disconnection ---
        socket.on("disconnect", () => {
            console.log("SocketHandlers: User disconnected:", socket.id);
            chatRateLimit.delete(socket.id); // Clean up rate limit data
            handleLeave(socket, io); // Use the same leave logic
            playerManager.removePlayer(socket.id);
        });

        // --- Error Handling ---
        socket.on("error", (err) => {
            console.error(`SocketHandlers: Socket error for ${socket.id} (${playerManager.getPlayerNickname(socket.id) || 'Unknown'}):`, err);
            // Attempt graceful leave on error
            handleLeave(socket, io);
        });
    });
}

// --- Helper Functions ---

function broadcastLobbyUpdate(io) {
    const lobbyTables = roomManager.getLobbyTables();
    const lobbyPlayerIds = playerManager.getPlayersInLobby();
    lobbyPlayerIds.forEach(socketId => {
        io.to(socketId).emit("tableListUpdate", lobbyTables);
    });
    console.log("SocketHandlers: Broadcasted lobby update to", lobbyPlayerIds.length, "players.");
}

function handleLeave(socket, io) {
    const playerId = socket.id;
    const player = playerManager.getPlayer(playerId);
    if (!player) return;

    const roomId = player.currentRoomId;
    if (!roomId) return;

    console.log(`SocketHandlers: Handling leave for ${player.nickname || playerId} from room ${roomId}`);

    const leaveResult = roomManager.handlePlayerLeave(roomId, playerId);
    playerManager.setPlayerRoom(playerId, null);
    socket.leave(roomId);

    // Force client back to main menu immediately
    socket.emit("forceMainMenu");

    // Notify remaining players about the leave for WebRTC cleanup
    // Use the event name the client expects: "voiceUserDisconnected"
    const remainingPlayerIds = leaveResult.remainingPlayerIds || [];
    remainingPlayerIds.forEach(remainingId => {
        io.to(remainingId).emit("voiceUserDisconnected", { socketId: playerId });
    });

    // Handle game state changes due to leave
    if (leaveResult.outcome === "opponent_left_game_over") {
        const remainingPlayerId = leaveResult.remainingPlayerId;
        if (remainingPlayerId) {
            // Ensure gameOverData includes winnerId
            const gameOverData = {
                ...leaveResult.gameOverData,
                winnerId: remainingPlayerId // The remaining player is the winner
            };
            io.to(remainingPlayerId).emit("gameOver", gameOverData);
            io.to(remainingPlayerId).emit("playerLeft", { nickname: leaveResult.nickname });
        }
    } else if (leaveResult.outcome === "player_left" || leaveResult.outcome === "player_left_finished") {
        const remainingPlayerId = leaveResult.remainingPlayerId;
        if (remainingPlayerId) {
            io.to(remainingPlayerId).emit("playerLeft", { nickname: leaveResult.nickname });
        }
    }

    if (leaveResult.shouldDeleteRoom) {
        roomManager.removeRoom(roomId);
    }

    broadcastLobbyUpdate(io);
}

module.exports = { initializeSocketHandlers };

