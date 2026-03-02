import { useRef } from 'react';

export default function FileUpload({ onFileSelect, disabled }) {
    const inputRef = useRef(null);

    const handleChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            onFileSelect(file);
            e.target.value = '';
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && file.type === 'application/pdf') {
            onFileSelect(file);
        }
    };

    return (
        <>
            <input
                ref={inputRef}
                type="file"
                accept="application/pdf"
                onChange={handleChange}
                className="hidden"
            />
            <button
                onClick={() => inputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                disabled={disabled}
                className="p-2.5 rounded-lg bg-surface-800 text-gray-500
                    hover:bg-surface-600 hover:text-gray-300
                    transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Upload PDF"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            </button>
        </>
    );
}
