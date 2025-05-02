# Arquitetura do Jogo Multiplayer

Este documento descreve a arquitetura planejada para o jogo multiplayer 2D pixelado, focando em escalabilidade, robustez e nos requisitos do usuário.

## 1. Visão Geral

O sistema será composto por um servidor backend Node.js e um cliente frontend baseado em HTML, SCSS e JavaScript moderno. A comunicação em tempo real será gerenciada via WebSockets (Socket.IO), e um banco de dados MySQL será usado para persistência mínima (se necessário, principalmente para gerenciamento de salas ativas).

## 2. Componentes

### 2.1. Servidor (Node.js)

*   **Framework:** Express.js para lidar com requisições HTTP básicas (servir arquivos estáticos) e como base para o servidor Socket.IO.
*   **Comunicação Real-time:** Socket.IO para gerenciar conexões WebSocket, salas (mesas de jogo) e a troca de mensagens/eventos entre cliente e servidor.
*   **Gerenciamento de Salas (Mesas):** Lógica para criar, listar, buscar, entrar e sair de mesas. As mesas serão armazenadas em memória no servidor para acesso rápido. Mesas vazias serão automaticamente destruídas.
*   **Gerenciamento de Jogadores:** Rastreamento de jogadores conectados, seus nicknames e a mesa em que estão.
*   **Lógica do Jogo:** Implementação das regras do jogo (baseado no exemplo, mas adaptado para multiplayer), gerenciamento de turnos e estado do jogo por mesa.
*   **Banco de Dados (MySQL):** Conexão gerenciada com `mysql2`. Inicialmente, pode não ser estritamente necessário se as salas ativas forem gerenciadas apenas em memória. Poderia ser usado para persistir nicknames ou configurações de sala se necessário no futuro, mas o requisito atual de destruir salas vazias simplifica isso.
*   **Estrutura de Módulos:** O código do servidor será organizado em módulos para separar responsabilidades (ex: `server.js`, `socketHandler.js`, `roomManager.js`, `gameLogic.js`, `db.js`).
*   **Tratamento de Erros:** Implementação robusta de tratamento de erros em todas as camadas (conexões, eventos de socket, lógica de jogo, acesso ao DB).

### 2.2. Cliente (HTML/SCSS/JS)

*   **Estrutura:** Single Page Application (SPA) gerenciada por JavaScript. O HTML (`index.html`) servirá como ponto de entrada.
*   **Interface do Usuário (UI):**
    *   **Telas:** Implementação das telas solicitadas: Nickname, Menu Principal (Ver/Criar Mesa), Lobby (Lista de Mesas com busca), Sala de Jogo.
    *   **Estilo:** SCSS será usado para estilização, compilado para CSS. O estilo seguirá a estética 2D retrô pixelada, com foco em responsividade para telas pequenas (mobile-first).
    *   **Componentes:** A UI será dividida em componentes reutilizáveis (ex: botões, modais, lista de mesas) gerenciados por JavaScript.
*   **Comunicação:** O cliente usará a biblioteca Socket.IO para conectar-se ao servidor, enviar ações do jogador e receber atualizações de estado.
*   **Gerenciamento de Estado:** O estado da UI e do jogo no cliente será gerenciado por JavaScript, atualizado com base nas mensagens recebidas do servidor.
*   **Tratamento de Erros:** Exibição de mensagens de erro claras para o usuário em caso de problemas de conexão ou falhas de ação.

### 2.3. Banco de Dados (MySQL 8+)

*   **Schema:** Inicialmente mínimo. Poderia incluir uma tabela `active_rooms` se a persistência entre reinicializações do servidor for desejada, mas a gestão em memória é mais simples para o requisito de destruição automática.
    *   `rooms` (se necessário): `id`, `name`, `player_count`, `max_players`, `status`, `created_at`.
    *   `players` (se necessário para persistência): `id`, `nickname`, `socket_id`, `current_room_id`.
*   **Acesso:** O servidor usará a biblioteca `mysql2` com pool de conexões para interagir com o banco de dados de forma eficiente.

## 3. Fluxo de Comunicação (Socket.IO Events)

*   **Conexão:** `connect`, `disconnect`, `connect_error` (gerenciados pelo Socket.IO).
*   **Nickname:**
    *   Cliente -> Servidor: `setNickname` (payload: `{ nickname: string }`)
    *   Servidor -> Cliente: `nicknameAccepted` (payload: `{ nickname: string }`), `nicknameRejected` (payload: `{ reason: string }`)
*   **Gerenciamento de Mesas:**
    *   Cliente -> Servidor: `createTable` (payload: `{ tableName: string }`)
    *   Cliente -> Servidor: `listTables`
    *   Cliente -> Servidor: `joinTable` (payload: `{ tableId: string }`)
    *   Cliente -> Servidor: `leaveTable`
    *   Cliente -> Servidor: `searchTables` (payload: `{ query: string }`)
    *   Servidor -> Todos/Lobby: `tableListUpdate` (payload: `[ { id, name, playerCount, maxPlayers } ]`)
    *   Servidor -> Cliente: `tableCreated` (payload: `{ tableId, tableName }`)
    *   Servidor -> Cliente: `joinedTable` (payload: `{ tableId, gameState, players }`)
    *   Servidor -> Sala: `playerJoined` (payload: `{ nickname }`)
    *   Servidor -> Sala: `playerLeft` (payload: `{ nickname }`)
    *   Servidor -> Cliente: `tableNotFound`
    *   Servidor -> Cliente: `tableFull`
    *   Servidor -> Cliente: `error` (payload: `{ message: string }`)
*   **Jogo:**
    *   Cliente -> Servidor: `playerAction` (payload: `{ actionDetails }` - ex: `{ type: 'claimCell', row: number, col: number }`)
    *   Servidor -> Sala: `gameStateUpdate` (payload: `{ updatedState }`)
    *   Servidor -> Sala: `turnChange` (payload: `{ nextPlayerNickname }`)
    *   Servidor -> Sala: `gameOver` (payload: `{ winnerNickname, scores }`)

## 4. Considerações Adicionais

*   **Estilo Pixel Art:** Fontes e assets gráficos precisarão ser escolhidos ou criados para se adequar ao estilo retrô pixelado.
*   **Responsividade:** O design da UI será mobile-first, garantindo boa usabilidade em telas pequenas.
*   **Escalabilidade:** Embora inicialmente gerenciado em um único processo Node.js, a arquitetura deve permitir escalar horizontalmente no futuro (ex: usando um adaptador Socket.IO como Redis para sincronizar múltiplos servidores), se necessário.
*   **Segurança:** Validação de todos os dados recebidos do cliente no servidor. Considerar medidas contra spam ou abuso se um chat for adicionado.

