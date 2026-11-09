'use client';

import { useState, useRef, useEffect, useId, type KeyboardEvent } from 'react';
import { ChevronDown } from 'lucide-react';

type Option = {
    value: string;
    label: string;
};

interface SearchableSelectProps {
    id?: string;
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    required?: boolean;
}

export function SearchableSelect({ id, options, value, onChange, placeholder = 'Seleccionar...', required }: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeIndex, setActiveIndex] = useState(-1);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const generatedId = useId();
    const listId = `${id || generatedId}-options`;

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
    function selectOption(option: Option) {
        onChange(option.value);
        setIsOpen(false);
        setSearchTerm('');
        setActiveIndex(-1);
    }
    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'Escape') {
            setIsOpen(false);
        } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setIsOpen(true);
            setActiveIndex(index => {
                if (filteredOptions.length === 0) return 0;
                if (index < 0) return event.key === 'ArrowDown' ? 0 : filteredOptions.length - 1;
                return event.key === 'ArrowDown'
                    ? (index + 1) % filteredOptions.length
                    : (index - 1 + filteredOptions.length) % filteredOptions.length;
            });
        } else if (event.key === 'Enter' && isOpen && filteredOptions[activeIndex]) {
            event.preventDefault();
            selectOption(filteredOptions[activeIndex]);
        }
    }

    return (
        <div ref={wrapperRef} className="relative w-full">
            <div 
                className="flex min-h-12 w-full cursor-pointer items-center justify-between rounded-lg border border-line bg-surface px-3 text-ink focus-within:ring-2 focus-within:ring-brand"
                onClick={() => {
                    setIsOpen(true);
                    if (!isOpen) setSearchTerm(''); // Solo reiniciar si estaba cerrado
                }}
            >
                <input
                    id={id}
                    type="text"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={isOpen}
                    aria-controls={listId}
                    aria-activedescendant={isOpen && filteredOptions[activeIndex] ? `${listId}-${activeIndex}` : undefined}
                    required={required && !value}
                    className="w-full cursor-pointer border-none bg-transparent text-ink outline-none placeholder:text-muted"
                    placeholder={placeholder}
                    value={displayValue}
                    onChange={(e) => {
                        setIsOpen(true);
                        setSearchTerm(e.target.value);
                        setActiveIndex(-1);
                    }}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                />
                <ChevronDown className={`ml-2 h-4 w-4 text-muted transition ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div id={listId} role="listbox" className="absolute z-50 mt-2 max-h-60 w-full overflow-y-auto rounded-lg border border-line bg-surface shadow-lg">
                    {filteredOptions.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted">No se encontraron resultados</div>
                    ) : (
                        filteredOptions.map((option, index) => (
                            <div
                                key={option.value}
                                id={`${listId}-${index}`}
                                role="option"
                                aria-selected={option.value === value}
                                className={`cursor-pointer px-4 py-3 text-sm ${index === activeIndex ? 'bg-[var(--status-neutral-bg)] font-semibold text-brand' : 'text-ink hover:bg-canvas'}`}
                                onClick={() => selectOption(option)}
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
