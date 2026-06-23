'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

type Option = {
    value: string;
    label: string;
};

interface SearchableSelectProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    required?: boolean;
}

export function SearchableSelect({ options, value, onChange, placeholder = 'Seleccionar...', required }: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(o => o.value === value);
    const displayValue = isOpen ? searchTerm : (selectedOption?.label || '');

    const filteredOptions = options.filter(o => o.label.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div ref={wrapperRef} className="relative w-full">
            <div 
                className="w-full bg-black/40 border border-white/10 text-white rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-purple-500 flex items-center justify-between cursor-pointer"
                onClick={() => {
                    setIsOpen(true);
                    if (!isOpen) setSearchTerm(''); // Solo reiniciar si estaba cerrado
                }}
            >
                <input
                    type="text"
                    required={required && !value}
                    className="bg-transparent border-none outline-none w-full text-white placeholder-white/40 cursor-pointer"
                    placeholder={placeholder}
                    value={displayValue}
                    onChange={(e) => {
                        setIsOpen(true);
                        setSearchTerm(e.target.value);
                    }}
                    onFocus={() => setIsOpen(true)}
                />
                <ChevronDown className={`h-4 w-4 text-white/50 ml-2 transition ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-[#1a0f2e] border border-white/10 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                    {filteredOptions.length === 0 ? (
                        <div className="p-4 text-sm text-white/50 text-center">No se encontraron resultados</div>
                    ) : (
                        filteredOptions.map(option => (
                            <div
                                key={option.value}
                                className={`px-4 py-3 cursor-pointer transition text-sm ${option.value === value ? 'bg-purple-600/40 text-white font-medium' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                    setSearchTerm('');
                                }}
                            >
                                {option.label}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
