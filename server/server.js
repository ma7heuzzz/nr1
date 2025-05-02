// server/server.js - Main entry point

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const { initializeSocketHandlers } = require("./socketHandlers.js");

// Basic error handling for critical setup
try {
    const app = express();
    const server = http.createServer(app);
    const io = new Server(server, {
        pingInterval: 25000, // Default: 25s
        pingTimeout: 30000,  // Increased from default 20s to 30s
        // Optional: Allow more buffer for upgrade mechanism if needed
        // upgradeTimeout: 30000,
    });

    const PORT = process.env.PORT || 3000;

    // Serve static files from the 'public' directory
    const publicPath = path.join(__dirname, "..", "public");
    app.use(express.static(publicPath));

    // Initialize Socket.IO event handlers
    initializeSocketHandlers(io);

    // Route for the main page (optional, as static middleware handles it)
    // app.get("/", (req, res) => {
    //     res.sendFile(path.join(publicPath, "index.html"));
    // });

    // Start the server
    server.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://0.0.0.0:${PORT}`);
        console.log(`Game accessible at: http://localhost:${PORT}`);
    });

} catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
}

