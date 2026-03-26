/**
 * Componente: Modal de Selección de Modificadores
 * Permite seleccionar modificadores para un producto con checkbox múltiple
 */

'use client';

import { ProductModifier } from '@prisma/client';
import { useState } from 'react';

interface ModifierModalProps {
    isOpen: boolean;
    onClose: () => void;
    productName: string;
    availableModifiers: ProductModifier[];
    onConfirm: (selectedModifiers: ProductModifier[]) => void;
}

export default function ModifierModal({
    isOpen,
    onClose,
    productName,
    availableModifiers,
    onConfirm,
}: ModifierModalProps) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    if (!isOpen) return null;

    const toggleModifier = (modifierId: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(modifierId)) {
            newSelected.delete(modifierId);
        } else {
            newSelected.add(modifierId);
        }
        setSelectedIds(newSelected);
    };

    const handleConfirm = () => {
        const selected = availableModifiers.filter((mod) => selectedIds.has(mod.id));
        onConfirm(selected);
        setSelectedIds(new Set());
    };

    const handleCancel = () => {
        setSelectedIds(new Set());
        onClose();
    };

    const totalAdditional = Array.from(selectedIds).reduce((sum, id) => {
        const modifier = availableModifiers.find((m) => m.id === id);
        return sum + (modifier?.price || 0);
    }, 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-800">
                        Modificadores: {productName}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Selecciona los modificadores que deseas agregar
                    </p>
                </div>

                {/* Lista de modificadores */}
                <div className="px-6 py-4 max-h-96 overflow-y-auto">
                    {availableModifiers.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">
                            No hay modificadores disponibles para este producto
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {availableModifiers.map((modifier) => (
                                <label
                                    key={modifier.id}
                                    className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(modifier.id)}
                                        onChange={() => toggleModifier(modifier.id)}
                                        className="w-5 h-5 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                                    />
                                    <div className="flex-1">
                                        <div className="font-medium text-gray-800">
                                            {modifier.name}
                                        </div>
                                        {modifier.description && (
                                            <div className="text-sm text-gray-500">
                                                {modifier.description}
                                            </div>
                                        )}
                                    </div>
                                    <div className="font-bold text-orange-600">
                                        +Bs. {modifier.price.toFixed(2)}
                                    </div>
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-sm text-gray-600">
                            Total adicional:
                        </span>
                        <span className="text-lg font-bold text-orange-600">
                            Bs. {totalAdditional.toFixed(2)}
                        </span>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handleCancel}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleConfirm}
                            className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition"
                        >
                            Confirmar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
