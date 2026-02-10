/**
 * soundManager.js
 * Synthesized Sound Effects using Web Audio API
 */
class SoundManager {
    constructor() {
        this.audioCtx = null;
        this.isMuted = false;
    }

    /**
     * Initialize AudioContext. 
     * Must be called after user interaction (e.g. click).
     */
    init() {
        if (!this.audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioContext();
        } else if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }

    /**
     * Play Coin Sound (High pitched Ding)
     */
    playCoin() {
        if (this.isMuted || !this.audioCtx) return;

        const osc = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, this.audioCtx.currentTime); // Start high
        osc.frequency.exponentialRampToValueAtTime(1800, this.audioCtx.currentTime + 0.1); // Go higher

        gainNode.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.3);

        osc.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);

        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.3);
    }

    /**
     * Play Hit/Explosion Sound
     */
    playHit() {
        if (this.isMuted || !this.audioCtx) return;

        const osc = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.5); // Drop pitch

        gainNode.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.5);

        osc.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);

        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.5);
    }

    /**
     * Play Level Up Sound (Arpeggio)
     */
    playLevelUp() {
        if (this.isMuted || !this.audioCtx) return;

        const now = this.audioCtx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C Major arpeggio

        notes.forEach((freq, index) => {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();

            osc.type = 'square';
            osc.frequency.value = freq;

            const time = now + (index * 0.1);

            gain.gain.setValueAtTime(0.1, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);

            osc.connect(gain);
            gain.connect(this.audioCtx.destination);

            osc.start(time);
            osc.stop(time + 0.3);
        });
    }

    /**
     * Play Game Over Sound (Sad descent)
     */
    playGameOver() {
        if (this.isMuted || !this.audioCtx) return;

        const osc = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, this.audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(100, this.audioCtx.currentTime + 1.0); // Slow drop

        gainNode.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.01, this.audioCtx.currentTime + 1.0);

        osc.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);

        osc.start();
        osc.stop(this.audioCtx.currentTime + 1.0);
    }
    /**
     * Play Heal Sound (Pleasant Chime)
     */
    playHeal() {
        if (this.isMuted || !this.audioCtx) return;

        const osc = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, this.audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(880, this.audioCtx.currentTime + 0.1);

        gainNode.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.5);

        osc.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);

        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.5);
    }

    /**
     * Play Clear Screen Sound (Powerful Whoosh)
     */
    playClear() {
        if (this.isMuted || !this.audioCtx) return;

        const osc = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();

        // White noise buffer would be better, but let's use a low freq sine sweep + high volume
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, this.audioCtx.currentTime + 0.5);

        gainNode.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.5);

        osc.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);

        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.5);
    }
}

// Export global
window.SoundManager = SoundManager;
