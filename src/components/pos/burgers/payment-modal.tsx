/**
 * Componente: Modal de Pago con Split Payment
 * Permite seleccionar método de pago y dividir entre efectivo/tarjeta/transferencia
 */

'use client';

import { useState } from 'react';
import { PaymentMethod } from '@prisma/client';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    total: number;
    onConfirm: (paymentData: {
        method: PaymentMethod;
        cashAmount?: number;
        cardAmount?: number;
        transferAmount?: number;
    }) => void;
}

export default function PaymentModal({
    isOpen,
    onClose,
    total,
    onConfirm,
}: PaymentModalProps) {
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(
        PaymentMethod.CASH
    );
    const [cashAmount, setCashAmount] = useState<string>(total.toFixed(2));
    const [cardAmount, setCardAmount] = useState<string>('0.00');
    const [transferAmount, setTransferAmount] = useState<string>('0.00');

    if (!isOpen) return null;

    const handleMethodChange = (method: PaymentMethod) => {
        setSelectedMethod(method);

        // Reset amounts
        if (method === PaymentMethod.CASH) {
            setCashAmount(total.toFixed(2));
            setCardAmount('0.00');
            setTransferAmount('0.00');
        } else if (method === PaymentMethod.CARD) {
            setCashAmount('0.00');
            setCardAmount(total.toFixed(2));
            setTransferAmount('0.00');
        } else if (method === PaymentMethod.TRANSFER) {
            setCashAmount('0.00');
            setCardAmount('0.00');
            setTransferAmount(total.toFixed(2));
        } else if (method === PaymentMethod.MIXED) {
            // Dividir 50/50 por defecto
            const half = (total / 2).toFixed(2);
            setCashAmount(half);
            setCardAmount(half);
            setTransferAmount('0.00');
        }
    };

    const calculateTotal = () => {
        return (
            parseFloat(cashAmount || '0') +
            parseFloat(cardAmount || '0') +
            parseFloat(transferAmount || '0')
        );
    };

    const calculateChange = () => {
        const paid = calculateTotal();
        return Math.max(0, paid - total);
    };

    const isValid = () => {
        const paid = calculateTotal();
        return paid >= total;
    };

    const handleConfirm = () => {
        if (!isValid()) {
            alert('El monto pagado es insuficiente');
            return;
        }

        const cash = parseFloat(cashAmount || '0');
        const card = parseFloat(cardAmount || '0');
        const transfer = parseFloat(transferAmount || '0');

        onConfirm({
            method: selectedMethod,
            cashAmount: cash > 0 ? cash : undefined,
            cardAmount: card > 0 ? card : undefined,
            transferAmount: transfer > 0 ? transfer : undefined,
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 bg-orange-600 text-white rounded-t-lg">
                    <h2 className="text-xl font-bold">Procesar Pago</h2>
                    <p className="text-white/80 mt-1">
                        Total a pagar: <span className="font-bold">Bs. {total.toFixed(2)}</span>
                    </p>
                </div>

                {/* Método de pago */}
                <div className="px-6 py-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Método de Pago
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {Object.values(PaymentMethod).map((method) => (
                            <button
                                key={method}
                                onClick={() => handleMethodChange(method)}
                                className={`px-4 py-3 rounded-lg border-2 font-medium transition ${selectedMethod === method
                                        ? 'border-orange-600 bg-orange-50 text-orange-700'
                                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                {method === PaymentMethod.CASH && 'Efectivo'}
                                {method === PaymentMethod.CARD && 'Tarjeta'}
                                {method === PaymentMethod.TRANSFER && 'Transferencia'}
                                {method === PaymentMethod.MIXED && 'Mixto'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Montos */}
                <div className="px-6 py-4 border-t border-gray-100 space-y-3">
                    {(selectedMethod === PaymentMethod.CASH ||
                        selectedMethod === PaymentMethod.MIXED) && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Efectivo
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={cashAmount}
                                    onChange={(e) => setCashAmount(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    placeholder="0.00"
                                />
                            </div>
                        )}

                    {(selectedMethod === PaymentMethod.CARD ||
                        selectedMethod === PaymentMethod.MIXED) && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tarjeta
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={cardAmount}
                                    onChange={(e) => setCardAmount(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    placeholder="0.00"
                                />
                            </div>
                        )}

                    {(selectedMethod === PaymentMethod.TRANSFER ||
                        selectedMethod === PaymentMethod.MIXED) && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Transferencia
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={transferAmount}
                                    onChange={(e) => setTransferAmount(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    placeholder="0.00"
                                />
                            </div>
                        )}
                </div>

                {/* Resumen */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Total a pagar:</span>
                            <span className="font-semibold">Bs. {total.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Total pagado:</span>
                            <span className="font-semibold">
                                Bs. {calculateTotal().toFixed(2)}
                            </span>
                        </div>
                        {selectedMethod === PaymentMethod.CASH && calculateChange() > 0 && (
                            <div className="flex justify-between text-green-600 font-bold">
                                <span>Cambio:</span>
                                <span>Bs. {calculateChange().toFixed(2)}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!isValid()}
                        className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${isValid()
                                ? 'bg-orange-600 text-white hover:bg-orange-700'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                    >
                        Confirmar Pago
                    </button>
                </div>
            </div>
        </div>
    );
}
