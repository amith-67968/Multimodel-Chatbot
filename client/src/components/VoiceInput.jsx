import { useState, useEffect, useRef, useCallback } from 'react';

export default function VoiceInput({ onTranscript, disabled, assistantMode = false, onListeningChange }) {
    const [listening, setListening] = useState(false);
    const recognitionRef = useRef(null);
    const assistantModeRef = useRef(assistantMode);

    // Keep ref in sync for use inside callbacks
    useEffect(() => {
        assistantModeRef.current = assistantMode;
    }, [assistantMode]);

    // Notify parent of listening state changes
    const updateListening = useCallback((value) => {
        setListening(value);
        onListeningChange?.(value);
    }, [onListeningChange]);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
            const transcript = event.results[event.results.length - 1][0].transcript;
            onTranscript(transcript);
            // In non-assistant mode, stop after one result
            if (!assistantModeRef.current) {
                updateListening(false);
            }
        };

        recognition.onerror = (e) => {
            // In assistant mode, ignore "no-speech" and "aborted" — keep going
            if (assistantModeRef.current && (e.error === 'no-speech' || e.error === 'aborted')) {
                return;
            }
            updateListening(false);
        };

        recognition.onend = () => {
            // In assistant mode, auto-restart unless explicitly stopped
            if (assistantModeRef.current) {
                try {
                    recognition.start();
                } catch {
                    // Already started or other error — ignore
                }
                return;
            }
            updateListening(false);
        };

        recognitionRef.current = recognition;

        return () => {
            try { recognition.stop(); } catch { /* noop */ }
        };
    }, [onTranscript, updateListening]);

    // React to assistantMode toggling from the parent
    useEffect(() => {
        const rec = recognitionRef.current;
        if (!rec) return;

        if (assistantMode) {
            // Start continuous listening
            rec.continuous = true;
            try {
                rec.start();
                updateListening(true);
            } catch {
                // Recognition may already be running
            }
        } else {
            // Stop everything
            rec.continuous = false;
            try { rec.stop(); } catch { /* noop */ }
            updateListening(false);
        }
    }, [assistantMode, updateListening]);

    const toggle = () => {
        if (!recognitionRef.current) return;
        if (listening) {
            recognitionRef.current.stop();
            updateListening(false);
        } else {
            recognitionRef.current.continuous = assistantModeRef.current;
            recognitionRef.current.start();
            updateListening(true);
        }
    };

    const supported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!supported) return null;

    // In assistant mode the parent controls the mic, so hide the standalone button
    if (assistantMode) return null;

    return (
        <button
            onClick={toggle}
            disabled={disabled}
            className={`p-2.5 rounded-lg transition-all duration-200
                ${listening
                    ? 'bg-red-500 text-white mic-pulse'
                    : 'bg-surface-800 text-gray-500 hover:bg-surface-600 hover:text-gray-300'
                }
                disabled:opacity-40 disabled:cursor-not-allowed`}
            title={listening ? 'Stop listening' : 'Start voice input'}
        >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {listening ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                )}
            </svg>
        </button>
    );
}
