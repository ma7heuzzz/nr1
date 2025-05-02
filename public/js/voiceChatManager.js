// import SimplePeer from 'simple-peer'; // Removed: Using global SimplePeer from script tag
import { getSocket, getMyPlayerId } from './stateManager.js';
import soundManager from './soundManager.js';
// Import UI functions for feedback
import { updateSpeakingIndicator } from './uiUtils.js';
import { showModal } from './ui.js'; // Import showModal for error messages

// Armazena as conexões peer ativas, mapeando socketId do outro jogador para a instância do Peer
const peers = {};
let localStream = null;
let isVoiceChatEnabled = false;
let isMuted = false;

// Web Audio API related variables
let audioContext = null;
let localAnalyser = null;
const remoteAnalysers = {}; // peerId -> AnalyserNode
let animationFrameId = null;
const SPEAKING_THRESHOLD = 60; // Adjust this threshold based on testing

/**
 * Inicializa o gerenciador de chat de voz.
 * Configura listeners para eventos de sinalização do servidor.
 */
function initVoiceChat() {
    const socket = getSocket();

    // Recebe oferta de outro peer
    socket.on('voiceSignal', ({ signal, senderId }) => {
        console.log(`Received signal from ${senderId}`);
        const peer = peers[senderId];
        if (peer) {
            peer.signal(signal);
        } else {
            console.warn(`Received signal from unknown peer: ${senderId}`);
            startPeerConnection(senderId, false); // Inicia a conexão como receptor
            setTimeout(() => {
                if (peers[senderId]) {
                    peers[senderId].signal(signal);
                } else {
                    console.error(`Peer ${senderId} still not found after delay.`);
                }
            }, 500);
        }
    });

    // Peer desconectou
    socket.on('voiceUserDisconnected', ({ socketId }) => {
        console.log(`Peer ${socketId} disconnected from voice chat.`);
        if (peers[socketId]) {
            peers[socketId].destroy();
            delete peers[socketId];
            removePeerAudioElement(socketId);
            stopRemoteAudioAnalysis(socketId);
        }
    });

    console.log('Voice Chat Manager Initialized');
}

/**
 * Inicializa o AudioContext.
 */
function initAudioContext() {
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('AudioContext initialized.');
        } catch (e) {
            console.error('Error initializing AudioContext:', e);
            showModal("Erro ao inicializar o sistema de áudio do navegador.");
        }
    }
}

/**
 * Inicia a análise de áudio para o stream local.
 */
function startLocalAudioAnalysis() {
    if (!audioContext || !localStream || localAnalyser) return;
    try {
        const source = audioContext.createMediaStreamSource(localStream);
        localAnalyser = audioContext.createAnalyser();
        localAnalyser.fftSize = 512;
        source.connect(localAnalyser);
        console.log('Local audio analysis started.');
        if (!animationFrameId) {
            startVolumeMonitoring(); // Start monitoring loop if not already running
        }
    } catch (e) {
        console.error('Error starting local audio analysis:', e);
    }
}

/**
 * Para a análise de áudio local.
 */
function stopLocalAudioAnalysis() {
    if (localAnalyser) {
        // Disconnect analyser safely
        try {
            localAnalyser.disconnect();
        } catch (e) { console.warn("Error disconnecting local analyser:", e); }
        localAnalyser = null;
        console.log('Local audio analysis stopped.');
        // Stop monitoring loop if no analysers are left
        if (Object.keys(remoteAnalysers).length === 0) {
            stopVolumeMonitoring();
        }
    }
}

/**
 * Inicia a análise de áudio para um stream remoto.
 * @param {MediaStream} stream - O stream remoto.
 * @param {string} peerId - O ID do peer.
 */
function startRemoteAudioAnalysis(stream, peerId) {
    if (!audioContext || !stream || remoteAnalysers[peerId]) return;
    try {
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        remoteAnalysers[peerId] = analyser;
        console.log(`Remote audio analysis started for ${peerId}.`);
        if (!animationFrameId) {
            startVolumeMonitoring(); // Start monitoring loop if not already running
        }
    } catch (e) {
        console.error(`Error starting remote audio analysis for ${peerId}:`, e);
    }
}

/**
 * Para a análise de áudio remoto para um peer específico.
 * @param {string} peerId - O ID do peer.
 */
function stopRemoteAudioAnalysis(peerId) {
    if (remoteAnalysers[peerId]) {
        // Disconnect analyser safely
        try {
             remoteAnalysers[peerId].disconnect();
        } catch (e) { console.warn(`Error disconnecting remote analyser for ${peerId}:`, e); }
        delete remoteAnalysers[peerId];
        console.log(`Remote audio analysis stopped for ${peerId}.`);
        // Stop monitoring loop if no analysers are left
        if (!localAnalyser && Object.keys(remoteAnalysers).length === 0) {
            stopVolumeMonitoring();
        }
        // Ensure UI indicator is turned off
        updateSpeakingIndicator(peerId, false);
    }
}

/**
 * Inicia o loop de monitoramento de volume.
 */
function startVolumeMonitoring() {
    if (animationFrameId || !audioContext) return;
    console.log('Starting volume monitoring loop.');
    // Determine bufferLength safely
    const firstAnalyser = localAnalyser || Object.values(remoteAnalysers)[0];
    if (!firstAnalyser) {
        console.warn('Cannot start volume monitoring: No analysers available.');
        return;
    }
    const bufferLength = firstAnalyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function checkVolume() {
        // Check local volume
        if (localAnalyser) {
            try {
                localAnalyser.getByteTimeDomainData(dataArray);
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    const value = (dataArray[i] - 128) / 128.0; // Normalize to -1.0 to 1.0
                    sum += value * value;
                }
                const rms = Math.sqrt(sum / bufferLength);
                const volume = Math.round(rms * 100); // Scale to 0-100 approx
                const isSpeaking = volume > SPEAKING_THRESHOLD && !isMuted;
                updateSpeakingIndicator(getMyPlayerId(), isSpeaking);
            } catch (e) {
                console.error("Error checking local volume:", e);
                stopLocalAudioAnalysis(); // Stop analysis on error
            }
        }

        // Check remote volumes
        for (const peerId in remoteAnalysers) {
            const analyser = remoteAnalysers[peerId];
            try {
                analyser.getByteTimeDomainData(dataArray);
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    const value = (dataArray[i] - 128) / 128.0;
                    sum += value * value;
                }
                const rms = Math.sqrt(sum / bufferLength);
                const volume = Math.round(rms * 100);
                const isSpeaking = volume > SPEAKING_THRESHOLD;
                updateSpeakingIndicator(peerId, isSpeaking);
            } catch (e) {
                console.error(`Error checking remote volume for ${peerId}:`, e);
                stopRemoteAudioAnalysis(peerId); // Stop analysis for this peer on error
            }
        }

        // Continue loop only if there are active analysers
        if (localAnalyser || Object.keys(remoteAnalysers).length > 0) {
            animationFrameId = requestAnimationFrame(checkVolume);
        } else {
            stopVolumeMonitoring(); // Stop if no analysers left
        }
    }
    animationFrameId = requestAnimationFrame(checkVolume);
}

/**
 * Para o loop de monitoramento de volume.
 */
function stopVolumeMonitoring() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        console.log('Stopped volume monitoring loop.');
        // Ensure all indicators are turned off
        updateSpeakingIndicator(getMyPlayerId(), false);
        Object.keys(remoteAnalysers).forEach(peerId => updateSpeakingIndicator(peerId, false));
    }
}

/**
 * Solicita acesso ao microfone e inicia o processo de conexão com outros peers na sala.
 * @param {string[]} peerIds - Array de IDs dos sockets dos outros jogadores na sala.
 */
async function startVoiceChat(peerIds) {
    if (isVoiceChatEnabled) {
        console.log('Voice chat already enabled.');
        return;
    }
    console.log('Starting voice chat...');
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        isVoiceChatEnabled = true;
        isMuted = false;
        soundManager.playSound('click');
        console.log('Microphone access granted.');

        initAudioContext();
        startLocalAudioAnalysis();

        updateVoiceChatUI();

        peerIds.forEach(peerId => {
            if (peerId !== getMyPlayerId()) {
                startPeerConnection(peerId, true);
            }
        });

    } catch (err) {
        console.error('Error accessing microphone:', err);
        isVoiceChatEnabled = false;
        // Provide user feedback based on error type
        let userMessage = "Erro desconhecido ao acessar o microfone.";
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            userMessage = "Permissão para acessar o microfone foi negada. Verifique as configurações do seu navegador.";
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            userMessage = "Nenhum microfone encontrado. Verifique se um microfone está conectado e habilitado.";
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
            userMessage = "Não foi possível ler o microfone. Pode estar sendo usado por outro aplicativo.";
        } else if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
            userMessage = "O microfone não suporta as configurações solicitadas.";
        } else if (err.name === 'SecurityError') {
            userMessage = "Acesso ao microfone bloqueado por motivos de segurança (página não segura?).";
        }
        showModal(userMessage); // Show the error message in a modal
        updateVoiceChatUI(); // Ensure UI reflects the disabled state
    }
}

/**
 * Para o chat de voz, libera o microfone e desconecta de todos os peers.
 */
function stopVoiceChat() {
    if (!isVoiceChatEnabled) return;
    console.log('Stopping voice chat...');

    stopLocalAudioAnalysis();
    Object.keys(remoteAnalysers).forEach(stopRemoteAudioAnalysis);

    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }

    for (const peerId in peers) {
        if (peers[peerId]) {
            peers[peerId].destroy();
        }
        removePeerAudioElement(peerId);
    }
    Object.keys(peers).forEach(key => delete peers[key]);

    isVoiceChatEnabled = false;
    isMuted = false;
    updateVoiceChatUI();

    console.log('Voice chat stopped.');
}

/**
 * Inicia uma nova conexão WebRTC com um peer específico.
 * @param {string} peerId - O ID do socket do peer para conectar.
 * @param {boolean} initiator - True se este cliente está iniciando a conexão.
 */
function startPeerConnection(peerId, initiator) {
    if (peers[peerId]) {
        console.log(`Connection with ${peerId} already exists or is being established.`);
        return;
    }
    if (!localStream) {
        console.error('Cannot start peer connection without local stream.');
        // Optionally show error to user
        // showModal("Erro interno: Não foi possível iniciar a conexão de voz sem acesso ao microfone.");
        return;
    }
    console.log(`Starting peer connection with ${peerId}. Initiator: ${initiator}`);

    const peer = new SimplePeer({
        initiator: initiator,
        trickle: true,
        stream: localStream,
    });

    peers[peerId] = peer;

    peer.on('signal', (signal) => {
        console.log(`Sending signal to ${peerId}`);
        getSocket().emit('voiceSignal', { signal, targetId: peerId });
    });

    peer.on('connect', () => {
        console.log(`Connected to peer ${peerId}`);
    });

    peer.on('stream', (remoteStream) => {
        console.log(`Received stream from ${peerId}`);
        playRemoteStream(remoteStream, peerId);
        startRemoteAudioAnalysis(remoteStream, peerId);
    });

    peer.on('close', () => {
        console.log(`Connection closed with peer ${peerId}`);
        delete peers[peerId];
        removePeerAudioElement(peerId);
        stopRemoteAudioAnalysis(peerId);
    });

    peer.on('error', (err) => {
        console.error(`Error in peer connection with ${peerId}:`, err);
        showModal(`Erro na conexão de voz com o outro jogador: ${err.message}`);
        if (peers[peerId]) {
            peers[peerId].destroy();
        }
        delete peers[peerId];
        removePeerAudioElement(peerId);
        stopRemoteAudioAnalysis(peerId);
    });
}

/**
 * Toca o stream de áudio recebido de um peer.
 * @param {MediaStream} stream - O stream de áudio remoto.
 * @param {string} peerId - O ID do peer que enviou o stream.
 */
function playRemoteStream(stream, peerId) {
    let audioElement = document.getElementById(`audio-${peerId}`);
    if (!audioElement) {
        audioElement = document.createElement('audio');
        audioElement.id = `audio-${peerId}`;
        audioElement.autoplay = true;
        // audioElement.controls = true; // Para debug
        const audioContainer = document.getElementById('remote-audio-container') || document.body;
        audioContainer.appendChild(audioElement);
        console.log(`Created audio element for ${peerId}`);
    }
    if (audioElement.srcObject !== stream) {
        audioElement.srcObject = stream;
        console.log(`Playing audio stream from ${peerId}`);
    }
}

/**
 * Remove o elemento de áudio de um peer que desconectou.
 * @param {string} peerId - O ID do peer.
 */
function removePeerAudioElement(peerId) {
    const audioElement = document.getElementById(`audio-${peerId}`);
    if (audioElement) {
        audioElement.remove();
        console.log(`Removed audio element for ${peerId}`);
    }
}

/**
 * Ativa ou desativa o mudo do microfone local.
 */
function toggleMute() {
    if (!isVoiceChatEnabled || !localStream) return;

    isMuted = !isMuted;
    localStream.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
    });
    console.log(`Microphone ${isMuted ? 'muted' : 'unmuted'}`);
    updateVoiceChatUI();
    // Update local speaking indicator immediately
    if (animationFrameId) {
        // The loop will handle the update based on volume and isMuted state
    }
}

/**
 * Atualiza a interface do usuário relacionada ao chat de voz (ex: botão de mudo).
 * Esta função é chamada internamente e também pode ser exportada se necessário.
 */
function updateVoiceChatUI() {
    const muteButton = document.getElementById('toggle-mute-button');
    const toggleVoiceButton = document.getElementById('toggle-voice-button');

    if (toggleVoiceButton) {
        if (isVoiceChatEnabled) {
            toggleVoiceButton.textContent = '🎤 Desativar Voz';
            toggleVoiceButton.classList.add('active');
        } else {
            toggleVoiceButton.textContent = '🎤 Ativar Voz';
            toggleVoiceButton.classList.remove('active');
        }
    }

    if (muteButton) {
        if (!isVoiceChatEnabled) {
            muteButton.disabled = true;
            muteButton.textContent = '🔇 Mutar';
            muteButton.classList.remove('muted');
        } else {
            muteButton.disabled = false;
            if (isMuted) {
                muteButton.textContent = '🔈 Desmutar';
                muteButton.classList.add('muted');
            } else {
                muteButton.textContent = '🔇 Mutar';
                muteButton.classList.remove('muted');
            }
        }
    }
}

/**
 * Adiciona um novo peer que acabou de entrar na sala.
 * @param {string} peerId - O ID do socket do novo peer.
 */
function handleNewPeer(peerId) {
    if (!isVoiceChatEnabled || !localStream || peerId === getMyPlayerId()) {
        return;
    }
    console.log(`New peer ${peerId} joined the room. Initiating voice connection.`);
    startPeerConnection(peerId, true);
}

export {
    initVoiceChat,
    startVoiceChat,
    stopVoiceChat,
    toggleMute,
    handleNewPeer,
    updateVoiceChatUI,
    addVoiceChatButtonListeners
};


/**
 * Adiciona listeners aos botões de controle do chat de voz (Ativar/Desativar, Mutar).
 */
function addVoiceChatButtonListeners() {
    const toggleVoiceButton = document.getElementById("toggle-voice-button");
    const muteButton = document.getElementById("toggle-mute-button");

    if (toggleVoiceButton) {
        toggleVoiceButton.addEventListener("click", () => {
            soundManager.playSound("click");
            if (isVoiceChatEnabled) {
                stopVoiceChat();
                // Informar outros na sala (opcional, depende da lógica do servidor)
                // getSocket().emit("leaveVoiceChat");
            } else {
                // Precisamos saber os IDs dos outros jogadores na sala para iniciar
                // Esta informação deve vir do stateManager ou ser passada como argumento
                // Exemplo: const currentRoom = getCurrentRoomState(); // Função hipotética
                // if (currentRoom && currentRoom.players) {
                //     const peerIds = currentRoom.players.map(p => p.id).filter(id => id !== getMyPlayerId());
                //     startVoiceChat(peerIds);
                // }
                console.warn("Cannot start voice chat from button without peer list.");
                showModal("Não é possível iniciar o chat de voz daqui. Entre em uma sala primeiro.");
            }
        });
    }

    if (muteButton) {
        muteButton.addEventListener("click", () => {
            if (isVoiceChatEnabled) {
                soundManager.playSound("click");
                toggleMute();
            }
        });
    }
    console.log("Voice chat button listeners added.");
}

