'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';

interface ImageUploadProps {
    value?: string | null;
    onChange: (url: string | null) => void;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
    sm: { wrapper: 'w-20 h-20', icon: 'h-6 w-6', text: 'text-xs' },
    md: { wrapper: 'w-32 h-32', icon: 'h-8 w-8', text: 'text-sm' },
    lg: { wrapper: 'w-48 h-48', icon: 'h-10 w-10', text: 'text-sm' },
};

export function ImageUpload({ value, onChange, className = '', size = 'md' }: ImageUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dragging, setDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const sz = SIZES[size];

    const uploadFile = useCallback(async (file: File) => {
        if (!file.type.startsWith('image/')) {
            setError('Solo imágenes (jpg, png, webp)');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setError('La imagen no puede superar 5 MB');
            return;
        }
        setError(null);
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch('/api/admin/upload-image', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                onChange(data.url);
            } else {
                setError(data.error || 'Error al subir');
            }
        } catch {
            setError('Error de conexión');
        } finally {
            setUploading(false);
        }
    }, [onChange]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) uploadFile(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) uploadFile(file);
    };

    return (
        <div className={`flex flex-col items-center gap-2 ${className}`}>
            <div
                className={`relative ${sz.wrapper} rounded-2xl border-2 transition-all cursor-pointer overflow-hidden
                    ${dragging ? 'border-orange-400 bg-orange-50 scale-105' : value ? 'border-transparent' : 'border-dashed border-gray-300 bg-gray-50 hover:border-orange-300 hover:bg-orange-50'}`}
                onClick={() => !uploading && inputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
            >
                {uploading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80">
                        <Loader2 className={`${sz.icon} animate-spin text-orange-500`} />
                        <span className={`${sz.text} text-orange-500 mt-1 font-medium`}>Subiendo…</span>
                    </div>
                ) : value ? (
                    <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={value} alt="Imagen del producto" className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition flex items-center justify-center opacity-0 hover:opacity-100">
                            <span className={`${sz.text} text-white font-semibold`}>Cambiar</span>
                        </div>
                    </>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                        <ImageIcon className={`${sz.icon} text-gray-300`} />
                        <span className={`${sz.text} text-gray-400 text-center px-2`}>
                            {dragging ? 'Suelta aquí' : 'Subir foto'}
                        </span>
                    </div>
                )}
            </div>

            {value && (
                <button type="button" onClick={() => onChange(null)}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition">
                    <X className="h-3 w-3" /> Quitar imagen
                </button>
            )}

            {error && <p className="text-xs text-red-500 text-center">{error}</p>}

            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden" onChange={handleChange} />

            {!value && !uploading && (
                <button type="button" onClick={() => inputRef.current?.click()}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-orange-600 transition">
                    <Upload className="h-3.5 w-3.5" /> o arrastrá una imagen
                </button>
            )}
        </div>
    );
}
