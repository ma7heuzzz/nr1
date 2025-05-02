# Documentação da Funcionalidade de Chat de Voz (Fase 3)

## Visão Geral

Esta documentação descreve a implementação do chat de voz em tempo real para o jogo Nr1, adicionado na Fase 3 do desenvolvimento. A funcionalidade permite que jogadores na mesma mesa de jogo se comuniquem por áudio diretamente através de seus navegadores, utilizando a tecnologia WebRTC.

## Implementação Técnica

A implementação foi realizada utilizando as seguintes tecnologias e abordagens:

1.  **WebRTC (Web Real-Time Communication):** A base da comunicação de áudio. O WebRTC permite conexões P2P (peer-to-peer) diretas entre navegadores para a transmissão de áudio (e vídeo, embora não utilizado aqui) com baixa latência.
2.  **`simple-peer`:** Uma biblioteca JavaScript que simplifica a criação e gerenciamento das conexões WebRTC (`RTCPeerConnection`). Ela abstrai grande parte da complexidade da API WebRTC nativa.
3.  **`navigator.mediaDevices.getUserMedia`:** API do navegador utilizada para solicitar permissão e capturar o stream de áudio do microfone do usuário.
4.  **WebSockets (Socket.IO):** Utilizado para a **sinalização** (signaling). A sinalização é o processo de troca de metadados entre os peers para estabelecer a conexão WebRTC. Isso inclui:
    *   **Ofertas (Offers) e Respostas (Answers):** Descrições da sessão (SDP) que definem as capacidades de mídia e configurações da conexão.
    *   **Candidatos ICE (ICE Candidates):** Informações sobre os endereços de rede (IP e porta) que os peers podem usar para se conectar diretamente.
    O servidor Socket.IO atua como um intermediário para retransmitir essas mensagens de sinalização entre os clientes na mesma sala.
5.  **Web Audio API:** Utilizada para implementar os **indicadores visuais de fala**. Um `AnalyserNode` é conectado ao stream de áudio local e aos streams remotos para monitorar o nível de volume. Quando o volume ultrapassa um limiar definido (`SPEAKING_THRESHOLD`), a interface do usuário é atualizada para indicar que o jogador está falando.

## Fluxo de Conexão

1.  **Entrada na Sala/Início do Jogo:** Quando um segundo jogador entra na sala ou o jogo começa, o cliente chama `startVoiceChat()`.
2.  **Acesso ao Microfone:** `startVoiceChat()` solicita permissão ao usuário para acessar o microfone via `getUserMedia()`.
3.  **Erro de Acesso:** Se o acesso for negado ou falhar, uma mensagem de erro é exibida ao usuário em um modal, e o chat de voz não é ativado.
4.  **Sucesso no Acesso:** Se o acesso for concedido:
    *   O stream de áudio local (`localStream`) é obtido.
    *   O `AudioContext` é inicializado (se ainda não estiver).
    *   A análise de áudio local é iniciada (`startLocalAudioAnalysis`).
    *   A UI é atualizada (botões de ativar/mutar são habilitados).
    *   Para cada outro jogador na sala, `startPeerConnection(peerId, true)` é chamado (o cliente atual atua como iniciador).
5.  **Criação do Peer (Iniciador):** `startPeerConnection` cria uma instância de `SimplePeer` com `initiator: true` e passa o `localStream`.
6.  **Sinalização (Oferta):** O `SimplePeer` automaticamente gera uma oferta SDP. O evento `signal` é disparado.
7.  **Envio da Oferta:** O handler do evento `signal` envia a oferta para o servidor Socket.IO via evento `voiceSignal`, especificando o `targetId` (ID do outro jogador).
8.  **Retransmissão da Oferta:** O servidor recebe a `voiceSignal` e retransmite a oferta para o `targetId`, incluindo o `senderId` (ID do iniciador).
9.  **Recebimento da Oferta (Não-Iniciador):** O cliente alvo recebe a `voiceSignal`. Como ainda não existe uma instância `Peer` para o `senderId`, ele chama `startPeerConnection(senderId, false)` (atuando como não-iniciador).
10. **Criação do Peer (Não-Iniciador):** `startPeerConnection` cria uma instância de `SimplePeer` com `initiator: false`.
11. **Processamento da Oferta e Criação da Resposta:** O `SimplePeer` do não-iniciador recebe a oferta (via `peer.signal(signal)`), processa-a e gera uma resposta SDP. O evento `signal` é disparado.
12. **Envio da Resposta:** O handler `signal` do não-iniciador envia a resposta para o servidor via `voiceSignal`, direcionada ao iniciador original.
13. **Retransmissão da Resposta:** O servidor retransmite a resposta para o iniciador original.
14. **Recebimento da Resposta (Iniciador):** O `SimplePeer` do iniciador recebe a resposta (via `peer.signal(signal)`).
15. **Troca de Candidatos ICE:** Ambos os peers começam a trocar candidatos ICE (também via evento `signal` e retransmissão pelo servidor) para encontrar o melhor caminho de conexão direta.
16. **Conexão Estabelecida:** Quando os peers conseguem se conectar diretamente, o evento `connect` é disparado em ambas as instâncias `SimplePeer`.
17. **Recebimento do Stream Remoto:** O evento `stream` é disparado em cada peer quando ele recebe o stream de áudio do outro. O handler `stream`:
    *   Cria um elemento `<audio>` para tocar o stream remoto (`playRemoteStream`).
    *   Inicia a análise de áudio para o stream remoto (`startRemoteAudioAnalysis`).
18. **Monitoramento de Volume:** O loop `checkVolume` (iniciado quando a primeira análise começa) monitora continuamente o volume local e remoto usando os `AnalyserNode`s e atualiza os indicadores visuais de fala (`updateSpeakingIndicator`).

## Módulos Principais Envolvidos

*   **`public/js/voiceChatManager.js`:** Contém toda a lógica principal do chat de voz no cliente (captura de mídia, gerenciamento de peers `simple-peer`, análise de áudio, tratamento de erros, controle de mudo).
*   **`public/js/socketHandlers.js` (Cliente):** Integra o `voiceChatManager` com os eventos do jogo (entrar/sair da sala, iniciar/terminar jogo). Chama `startVoiceChat`, `stopVoiceChat`, `handleNewPeer`. Inicializa o `voiceChatManager` (`initVoiceChat`).
*   **`public/js/uiRenderers.js`:** Renderiza os botões de controle (Ativar/Desativar Voz, Mutar/Desmutar) e o contêiner para os indicadores de fala. Inclui a função `updateSpeakingIndicator` (que precisa ser implementada para realmente mostrar/esconder os indicadores visuais baseados no ID do jogador e no estado de fala).
*   **`public/js/eventListeners.js`:** Adiciona os listeners de clique aos botões de controle de voz, chamando as funções correspondentes em `voiceChatManager` (`startVoiceChat`, `stopVoiceChat`, `toggleMute`).
*   **`public/js/ui.js`:** Contém a função `showModal` usada para exibir mensagens de erro relacionadas ao acesso ao microfone ou conexões WebRTC.
*   **`server/socketHandlers.js` (Servidor):** Contém os handlers para os eventos de sinalização (`voiceSignal`) e desconexão (`voiceUserDisconnected`), retransmitindo as mensagens entre os clientes apropriados na mesma sala.

## Funcionalidades Implementadas

*   Ativação/Desativação do chat de voz pelo usuário.
*   Captura de áudio do microfone.
*   Estabelecimento de conexões P2P via WebRTC.
*   Transmissão de áudio entre jogadores na mesma sala.
*   Funcionalidade de Mutar/Desmutar o próprio microfone.
*   Indicadores visuais de quem está falando (baseado em análise de volume).
*   Tratamento de erros para acesso ao microfone e conexões.
*   Limpeza automática de conexões e recursos ao sair da sala ou ao final do jogo.

## Considerações e Possíveis Melhorias

*   **Servidor TURN:** A implementação atual **não utiliza um servidor TURN**. Isso significa que a conexão P2P pode falhar para usuários atrás de firewalls ou NATs restritivos. Adicionar a configuração de um servidor TURN (gratuito ou pago) aumentaria significativamente a taxa de sucesso das conexões.
*   **Indicadores Visuais:** A função `updateSpeakingIndicator` foi importada mas sua implementação real (manipulação do DOM para mostrar/esconder um ícone ou mudar estilo) precisa ser feita em `uiRenderers.js` ou um módulo similar, associando o ID do jogador a um elemento visual específico na interface.
*   **Seleção de Dispositivo:** Não há opção para o usuário selecionar qual microfone usar.
*   **Controle de Volume:** Não há controle de volume individual para outros jogadores.
*   **Qualidade de Áudio:** Parâmetros como `SPEAKING_THRESHOLD` podem precisar de ajuste fino. Configurações de codec ou bitrate não foram exploradas.
*   **Feedback de Conexão:** O feedback visual sobre o estado da conexão de voz (conectando, conectado, erro) pode ser melhorado.
*   **Escalabilidade:** A abordagem P2P funciona bem para salas pequenas (2 jogadores). Para salas maiores, uma arquitetura com um Servidor de Mídia (SFU - Selective Forwarding Unit) seria mais eficiente.

## Testes

Testes manuais foram realizados para verificar:
*   Solicitação de permissão do microfone.
*   Ativação e desativação do chat de voz.
*   Funcionalidade de mudo/desmudo.
*   Transmissão de áudio entre dois jogadores.
*   Tratamento de erros ao negar permissão.
*   Desconexão e limpeza de recursos.

Testes mais abrangentes em diferentes navegadores, sistemas operacionais e condições de rede são recomendados.

