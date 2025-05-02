// server/board.js - Adapted for server-side logic

class Cell {
    constructor(row, col, value) {
        this.row = row;
        this.col = col;
        this.value = value;
        this.owner = null; // Stores player socket ID or identifier
    }
}

class Board {
    constructor(rows, cols) {
        this.rows = rows;
        this.cols = cols;
        this.grid = [];
        this.generate();
    }

    generate() {
        this.grid = [];
        for (let r = 0; r < this.rows; r++) {
            this.grid[r] = [];
            for (let c = 0; c < this.cols; c++) {
                const value = Math.floor(Math.random() * 9) + 1;
                this.grid[r][c] = new Cell(r, c, value);
            }
        }
    }

    getCell(row, col) {
        return this.grid?.[row]?.[col] || null;
    }

    // Check if a cell is adjacent to any cell owned by the player
    hasAdjacent(cell, playerId) {
        const directions = [
            [0, 1], [1, 0], [-1, 0], [0, -1], // Orthogonal
            // [1, 1], [1, -1], [-1, 1], [-1, -1] // Diagonal (optional)
        ];
        for (const [dr, dc] of directions) {
            const r = cell.row + dr;
            const c = cell.col + dc;
            if (this.grid[r]?.[c]?.owner === playerId) {
                return true;
            }
        }
        return false;
    }

    // Check if a move is valid for a given player
    isValidMove(cell, playerId, isFirstMove) {
        if (!cell || cell.owner) {
            return false; // Cell doesn't exist or is already owned
        }
        // First move doesn't require adjacency
        if (isFirstMove) {
            return true;
        }
        // Subsequent moves require adjacency to one of the player's cells
        return this.hasAdjacent(cell, playerId);
    }

    claimCell(cell, playerId) {
        if (cell && !cell.owner) {
            cell.owner = playerId;
            return true;
        }
        return false;
    }

    // Get all valid moves for a player
    getAvailableMoves(playerId, isFirstMove) {
        const moves = [];
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const cell = this.grid[r][c];
                if (this.isValidMove(cell, playerId, isFirstMove)) {
                    moves.push(cell);
                }
            }
        }
        return moves;
    }

    // Get a simplified representation of the board state for sending to clients
    getState() {
        return this.grid.map(row =>
            row.map(cell => ({
                r: cell.row,
                c: cell.col,
                v: cell.value,
                o: cell.owner // Send owner ID
            }))
        );
    }

    // Check if the board is full
    isFull() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (!this.grid[r][c].owner) {
                    return false;
                }
            }
        }
        return true;
    }
}

module.exports = Board;

