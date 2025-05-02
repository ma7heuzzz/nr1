// /home/ubuntu/phase4_game/public/js/lobbyRenderer.js

import {
    getElements, getCurrentTables
} from "./stateManager.js";
import {
    addLobbyBackButtonListener, addJoinButtonListeners, addLobbyRefreshButtonListener,
    addLobbySearchListener
} from "./eventListeners.js";

// Define game names for display globally within the module
// TODO: Consider moving this to a shared constants file if used elsewhere
const gameDisplayNames = {
    'checkers': 'Dama',
    'battleship': 'Batalha Naval',
    'backgammon': 'Gamão',
    'ludo': 'Ludo'
};

// Helper function to render a single table item HTML
function renderTableItemHTML(table) {
    const gameName = gameDisplayNames[table.gameType] || table.gameType || 'Desconhecido';
    let statusText = '';
    let actionButton = '';

    if (table.status === 'waiting' && table.hasVacancy) {
        actionButton = `<button class="join-table-button" data-table-id="${table.id}">Entrar</button>`;
    } else {
        switch (table.status) {
            case 'placement':
                statusText = '<span>(Posicionando)</span>';
                break;
            case 'playing':
                statusText = '<span>(Em Jogo)</span>';
                break;
            case 'waiting': // Waiting but full
                statusText = '<span>(Cheia)</span>';
                break;
            default:
                statusText = '<span>(Indisponível)</span>'; // Fallback
        }
        // Optionally add a 'Spectate' button for 'playing' or 'placement' tables
        // actionButton = `<button class="spectate-table-button" data-table-id="${table.id}">Observar</button>`;
    }

    return `
    <div class="table-item" data-game-type="${table.gameType || 'unknown'}">
        <span>${table.name} (${gameName}) - ${table.playerCount}/${table.maxPlayers}</span>
        <div class="table-status">
            ${statusText}
            ${actionButton}
        </div>
    </div>
    `;
}

export function renderLobbyScreen(tables = []) {
    const elements = getElements();
    let tableListHTML = "<p>Nenhuma mesa disponível.</p>";

    if (tables.length > 0) {
        tableListHTML = tables.map(renderTableItemHTML).join("");
    }

    // Preserve search value if re-rendering
    const searchInput = elements.lobbyScreen.querySelector("#search-table-input");
    const searchValue = searchInput ? searchInput.value : "";

    elements.lobbyScreen.innerHTML = `
        <h1>Lobby</h1>
        <div class="lobby-controls">
            <input type="text" id="search-table-input" placeholder="Pesquisar nome da mesa..." value="${searchValue}">
        </div>
        <div class="lobby-controls">
          <button id="refresh-lobby-button">Atualizar</button>
        </div>
        <div id="table-list-container">
            ${tableListHTML}
        </div>
        <button id="back-to-menu-button">Voltar</button>
    `;

    // Add listeners
    addLobbyBackButtonListener();
    addJoinButtonListeners();
    addLobbyRefreshButtonListener();
    addLobbySearchListener();

    // Re-apply filter if search value exists
    if (searchValue) {
        filterLobbyTables(searchValue);
    }
}

export function renderFilteredTableList(filteredTables) {
    const elements = getElements();
    const container = elements.lobbyScreen.querySelector("#table-list-container");
    if (!container) return;

    let tableListHTML = "<p>Nenhuma mesa encontrada.</p>";
    if (filteredTables.length > 0) {
        tableListHTML = filteredTables.map(renderTableItemHTML).join("");
    }
    container.innerHTML = tableListHTML;
    addJoinButtonListeners(); // Re-add listeners for the newly rendered buttons
}

// Function to apply filtering based on search input
function filterLobbyTables(searchTerm) {
    const currentTables = getCurrentTables(); // Get the full, up-to-date list
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const filteredTables = currentTables.filter(table =>
        table.name.toLowerCase().includes(lowerCaseSearchTerm)
    );
    renderFilteredTableList(filteredTables);
}

