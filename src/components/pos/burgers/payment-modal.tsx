'use client';

import { useState } from 'react';
import { PaymentMethod } from '@prisma/client';
import { Banknote, CreditCard, ArrowRightLeft, Shuffle, X, Loader2, User } from 'lucide-react';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    total: number;
    onConfirm: (paymentData: {
        method: PaymentMethod;
        cashAmount?: number;
        cardAmount?: number;
        transferAmount?: number;
        customerName?: string;
    }) => void;
}

const METHOD_CONFIG: { method: PaymentMethod; label: string; Icon: any }[] = [
    { method: PaymentMethod.CASH,     label: 'Efectivo',       Icon: Banknote      },
    { method: PaymentMethod.CARD,     label: 'Tarjeta',        Icon: CreditCard    },
    { method: PaymentMethod.TRANSFER, label: 'QR',             Icon: ArrowRightLeft },
    { method: PaymentMethod.MIXED,    label: 'Mixto',          Icon: Shuffle       },
];

export default function PaymentModal({ isOpen, onClose, total, onConfirm }: PaymentModalProps) {
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
    const [cashAmount,     setCashAmount]     = useState<string>(total.toFixed(2));
    const [cardAmount,     setCardAmount]     = useState<string>('0.00');
    const [transferAmount, setTransferAmount] = useState<string>('0.00');
    const [isProcessing,   setIsProcessing]   = useState(false);
    const [customerName,   setCustomerName]   = useState<string>('');

    if (!isOpen) return null;

    const handleMethodChange = (method: PaymentMethod) => {
        setSelectedMethod(method);
        if (method === PaymentMethod.CASH)     { setCashAmount(total.toFixed(2)); setCardAmount('0.00'); setTransferAmount('0.00'); }
        if (method === PaymentMethod.CARD)     { setCashAmount('0.00'); setCardAmount(total.toFixed(2)); setTransferAmount('0.00'); }
        if (method === PaymentMethod.TRANSFER) { setCashAmount('0.00'); setCardAmount('0.00'); setTransferAmount(total.toFixed(2)); }
        if (method === PaymentMethod.MIXED)    { const h = (total / 2).toFixed(2); setCashAmount(h); setCardAmount('0.00'); setTransferAmount(h); }
    };

    const paid   = parseFloat(cashAmount || '0') + parseFloat(cardAmount || '0') + parseFloat(transferAmount || '0');
    const change = Math.max(0, paid - total);
    const valid  = paid >= total;

    const handleConfirm = async () => {
        if (!valid || isProcessing) return;
        const cash     = parseFloat(cashAmount     || '0');
        const card     = parseFloat(cardAmount     || '0');
        const transfer = parseFloat(transferAmount || '0');
        
        // El cambio siempre se devuelve de la parte en efectivo.
        const actualCash = Math.max(0, cash - change);

        setIsProcessing(true);
        try {
            await onConfirm({
                method: selectedMethod,
                cashAmount:     actualCash > 0 ? actualCash : undefined,
                cardAmount:     card       > 0 ? card       : undefined,
                transferAmount: transfer   > 0 ? transfer   : undefined,
                customerName:   customerName.trim() || undefined,
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const inputClass = 'w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 text-lg font-semibold outline-none transition';

    const handleClose = () => {
        setCustomerName('');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto overflow-hidden max-h-[95vh] flex flex-col">

                {/* Header — rojo con letras blancas */}
                <div className="bg-red-600 px-6 py-5 text-white flex items-start justify-between shrink-0">
                    <div>
                        <h2 className="text-xl font-bold">Procesar Pago</h2>
                        <p className="text-white/80 mt-0.5 text-sm">
                            Total a pagar: <span className="font-black text-2xl text-white">Bs. {total.toFixed(2)}</span>
                        </p>
                        {customerName.trim() && (
                            <p className="text-yellow-200 text-sm font-semibold mt-1 flex items-center gap-1">
                                <User className="h-3.5 w-3.5" /> {customerName.trim()}
                            </p>
                        )}
                    </div>
                    <button onClick={handleClose} className="p-1 hover:bg-white/20 rounded-lg transition mt-0.5">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {/* Campo nombre del cliente / número de ticket */}
                    <div className="px-6 pt-4 pb-0">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Cliente / Ticket</p>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                            <User className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                            id="customer-name-input"
                            type="text"
                            value={customerName}
                            onChange={e => setCustomerName(e.target.value)}
                            placeholder="Nombre o Nº de ticket (opcional)"
                            maxLength={40}
                            className="w-full pl-9 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 text-sm font-semibold outline-none transition placeholder:text-gray-300"
                        />
                    </div>
                </div>

                {/* Métodos de pago */}
                <div className="px-6 py-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Método de pago</p>
                    <div className="grid grid-cols-2 gap-2">
                        {METHOD_CONFIG.map(({ method, label, Icon }) => (
                            <button
                                key={method}
                                onClick={() => handleMethodChange(method)}
                                className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 font-semibold text-sm transition ${
                                    selectedMethod === method
                                        ? 'border-yellow-400 bg-yellow-400 text-black shadow-lg shadow-yellow-200'
                                        : 'border-gray-200 bg-white text-gray-700 hover:border-yellow-300 hover:bg-yellow-50'
                                }`}
                            >
                                <Icon className="h-4 w-4" />
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Campos de monto */}
                <div className="px-6 pb-4 space-y-3 border-t border-gray-100 pt-4">
                    {(selectedMethod === PaymentMethod.CASH || selectedMethod === PaymentMethod.MIXED) && (
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">💵 Efectivo</label>
                            <input type="number" step="0.01" value={cashAmount === '0' ? '' : cashAmount}
                                onChange={e => setCashAmount(e.target.value)}
                                className={inputClass} placeholder="" />
                        </div>
                    )}
                    {(selectedMethod === PaymentMethod.CARD || selectedMethod === PaymentMethod.MIXED) && (
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">💳 Tarjeta</label>
                            <input type="number" step="0.01" value={cardAmount === '0' ? '' : cardAmount}
                                onChange={e => setCardAmount(e.target.value)}
                                className={inputClass} placeholder="" />
                        </div>
                    )}
                    {(selectedMethod === PaymentMethod.TRANSFER || selectedMethod === PaymentMethod.MIXED) && (
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">📲 QR</label>
                            <input type="number" step="0.01" value={transferAmount === '0' ? '' : transferAmount}
                                onChange={e => setTransferAmount(e.target.value)}
                                className={inputClass} placeholder="" />
                        </div>
                    )}
                </div>

                {/* Resumen */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 space-y-2 text-sm shrink-0">
                    <div className="flex justify-between text-gray-600">
                        <span>Total a pagar:</span>
                        <span className="font-bold text-gray-800">Bs. {total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                        <span>Total pagado:</span>
                        <span className={`font-bold ${paid >= total ? 'text-green-600' : 'text-red-500'}`}>
                            Bs. {paid.toFixed(2)}
                        </span>
                    </div>
                    {(selectedMethod === PaymentMethod.CASH || selectedMethod === PaymentMethod.MIXED) && change > 0 && (
                        <div className="flex justify-between font-black text-green-600 border-t border-green-100 pt-2">
                            <span>Cambio:</span>
                            <span>Bs. {change.toFixed(2)}</span>
                        </div>
                    )}
                </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 flex gap-3 shrink-0">
                    <button onClick={handleClose}
                        className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition">
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!valid || isProcessing}
                        className={`flex-[2] px-4 py-3 rounded-xl font-black text-base transition flex items-center justify-center gap-2 ${
                            valid && !isProcessing
                                ? 'bg-yellow-400 text-black hover:bg-yellow-300 shadow-lg shadow-yellow-200'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                    >
                        {isProcessing
                            ? <><Loader2 className="h-5 w-5 animate-spin" /> Procesando…</>
                            : 'Confirmar Pago'
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}
