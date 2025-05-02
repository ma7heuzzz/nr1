const soundManager = {
    sounds: {},
    isMuted: false,

    init() {
        // Load initial mute state from localStorage
        this.isMuted = localStorage.getItem('nr1_soundMuted') === 'true';
        console.log('Sound Manager Initialized. Muted:', this.isMuted);
        // Preload common sounds if desired, or load on demand
        this.loadSound('click', '/assets/click.mp3');
        // Add placeholders for other sounds - will load them later
        this.loadSound('win', '/assets/win_placeholder.mp3'); // Placeholder
        this.loadSound('lose', '/assets/lose_placeholder.mp3'); // Placeholder
        this.loadSound('move', '/assets/move_placeholder.mp3'); // Placeholder
        this.loadSound('opponent_move', '/assets/opponent_move_placeholder.mp3'); // Placeholder
        this.loadSound('start', '/assets/start_placeholder.mp3'); // Placeholder
        this.loadSound('chat', '/assets/chat_placeholder.mp3'); // Placeholder
    },

    loadSound(name, src) {
        const sound = new Audio(src);
        sound.preload = 'auto'; // Suggest browser to preload
        this.sounds[name] = sound;
    },

    playSound(name) {
        if (this.isMuted) {
            // console.log(`Sound '${name}' muted.`);
            return;
        }
        const sound = this.sounds[name];
        if (sound) {
            sound.currentTime = 0; // Rewind to start
            sound.play().catch(error => console.error(`Error playing sound '${name}':`, error));
        } else {
            console.warn(`Sound '${name}' not found.`);
        }
    },

    toggleMute() {
        this.isMuted = !this.isMuted;
        localStorage.setItem('nr1_soundMuted', this.isMuted);
        console.log('Sound Muted:', this.isMuted);
        // Optionally, stop all currently playing sounds
        if (this.isMuted) {
            Object.values(this.sounds).forEach(sound => {
                if (!sound.paused) {
                    sound.pause();
                    sound.currentTime = 0;
                }
            });
        }
        return this.isMuted;
    }
};

// Initialize the sound manager when the script loads
// Ensure this runs after the DOM is potentially ready or defer initialization
// For simplicity, initializing here. Consider moving init call to main client script.
// soundManager.init(); 

export default soundManager;

