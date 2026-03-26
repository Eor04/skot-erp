'use client';

import { useState } from 'react';

interface UseStockSuggestionsReturn {
    suggestions: any[];
    loading: boolean;
    error: string | null;
    generateSuggestions: (params: {
        branchId: string;
        days?: number;
        coverageDays?: number;
    }) => Promise<void>;
    generateTransfer: (productId: string, qty: number) => Promise<void>;
}

export function useStockSuggestions(): UseStockSuggestionsReturn {
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generateSuggestions = async ({
        branchId,
        days = 7,
        coverageDays = 7,
    }: {
        branchId: string;
        days?: number;
        coverageDays?: number;
    }) => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(
                `/api/inventory/suggestions?branchId=${branchId}&days=${days}&coverageDays=${coverageDays}`
            );
            const result = await response.json();

            if (result.success) {
                setSuggestions(result.data.suggestions);
            } else {
                setError(result.error || 'Error al generar sugerencias');
            }
        } catch (err: any) {
            setError(err.message || 'Error al generar sugerencias');
            console.error('Error en useStockSuggestions:', err);
        } finally {
            setLoading(false);
        }
    };

    const generateTransfer = async (productId: string, qty: number) => {
        // Esta función sería implementada para crear una transferencia automáticamente
        // Por ahora solo es un placeholder
        console.log('Generar transferencia:', { productId, qty });
    };

    return { suggestions, loading, error, generateSuggestions, generateTransfer };
}
