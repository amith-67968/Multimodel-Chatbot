/**
 * Speak text aloud using the Web Speech API
 */
let currentUtterance = null;

export function speak(text, onEnd = null) {
    stopSpeaking();

    // Clean markdown-ish characters for cleaner speech
    const clean = text
        .replace(/[#*_`~>]/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/\n{2,}/g, '. ')
        .replace(/\n/g, ', ');

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    // Try to pick a good English voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
        (v) => v.lang.startsWith('en') && v.name.toLowerCase().includes('google')
    );
    if (preferred) utterance.voice = preferred;
    else {
        const english = voices.find((v) => v.lang.startsWith('en'));
        if (english) utterance.voice = english;
    }

    if (onEnd) utterance.onend = onEnd;
    currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
    window.speechSynthesis.cancel();
    currentUtterance = null;
}

export function isSpeaking() {
    return window.speechSynthesis.speaking;
}
