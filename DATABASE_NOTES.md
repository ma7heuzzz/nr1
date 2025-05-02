# Notas sobre o Banco de Dados

## Decisão Inicial: Gerenciamento em Memória

Conforme descrito no documento `ARCHITECTURE.md` e analisando os requisitos atuais do jogo:

1.  **Destruição Automática de Mesas Vazias:** O requisito de que mesas vazias sejam automaticamente destruídas é mais simples e eficientemente implementado gerenciando as mesas (salas de jogo) ativas diretamente na memória do servidor Node.js. Quando o último jogador sai de uma mesa, ela pode ser removida da estrutura de dados em memória sem a necessidade de interação com um banco de dados.
2.  **Persistência Não Requerida (Inicialmente):** Os requisitos atuais (nickname temporário por sessão, criação/listagem/entrada em mesas voláteis) não exigem persistência de dados entre reinicializações do servidor ou sessões de usuário.
3.  **Simplicidade e Desempenho:** Gerenciar o estado das salas em memória oferece melhor desempenho para operações frequentes como listar, criar, entrar e verificar o estado das mesas.

**Portanto, a decisão inicial é adiar a criação de um esquema de banco de dados MySQL.** A biblioteca `mysql2` já está instalada como parte da configuração do ambiente (Etapa 002), permitindo a integração futura se/quando funcionalidades que exigem persistência (como contas de usuário permanentes, leaderboards, histórico de jogos, etc.) forem adicionadas.

## Estrutura de Dados em Memória (Exemplo)

O servidor manterá estruturas de dados em memória para gerenciar jogadores e mesas, por exemplo:

```javascript
// Exemplo simplificado em server.js ou roomManager.js

let players = {}; // { socketId: { nickname: '...', currentRoomId: '...' } }
let rooms = {};   // { roomId: { id: '...', name: '...', players: Set<socketId>, gameState: {...} } }

// Funções para adicionar/remover jogadores, criar/destruir salas, etc.
```

Esta abordagem atende aos requisitos atuais de forma robusta e eficiente, alinhada com a necessidade de um jogo escalável (a complexidade do banco de dados é introduzida apenas quando necessária).

