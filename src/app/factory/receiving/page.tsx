'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, PackagePlus, Plus, Trash2, Search, Check,
    AlertCircle, Loader2, RefreshCw, ChevronDown, ChevronUp,
    Truck, ClipboardCheck, Package, X,
} from 'lucide-react';
import { useSession } from '@/lib/session-context';

type Product = { id: string; name: string; sku: string; unit: string; type: string };
type Branch = { id: string; name: string; type: string };
type ReceiptItem = { productId: string; productName: string; unit: string; quantity: string; notes: string };

type HistoryReceipt = {
    reference: string; date: string; branchName: string; supplier: string; itemsCount: number;
    items: { id: string; quantity: number; previousStock: number; newStock: number; product: { name: string; sku: string; unit: string } }[];
};

const PRODUCT_TYPES = [
    { value: 'RAW_MATERIAL',  label: 'Materia Prima' },
    { value: 'ACAI_BASE',     label: 'Açaí Base' },
    { value: 'ACAI_TOPPING',  label: 'Topping Açaí' },
    { value: 'BURGER',        label: 'Ingrediente Burger' },
    { value: 'BURGER_EXTRA',  label: 'Extra / Porción' },
    { value: 'BEVERAGE',      label: 'Bebida' },
];

const UNITS = ['KG', 'G', 'L', 'ML', 'UN', 'CAJA', 'BOLSA', 'PAQUETE', 'DOCENA'];

const TYPE_LABEL: Record<string, string> = {
    RAW_MATERIAL: 'Mat. Prima', ACAI_BASE: 'Açaí Base', ACAI_TOPPING: 'Topping',
    BURGER: 'Burger', BURGER_EXTRA: 'Extra', BEVERAGE: 'Bebida',
};

/* ── Modal de producto rápido ───────────────────────────────────────────── */
function QuickProductModal({
    onClose, onCreated,
}: { onClose: () => void; onCreated: (p: Product) => void }) {
    const [name, setName]       = useState('');
    const [sku, setSku]         = useState('');
    const [unit, setUnit]       = useState('KG');
    const [type, setType]       = useState('RAW_MATERIAL');
    const [category, setCategory] = useState('');
    const [saving, setSaving]   = useState(false);
    const [err, setErr]         = useState('');

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim() || !sku.trim()) return setErr('Nombre y SKU son obligatorios');
        setSaving(true); setErr('');
        try {
            const res = await fetch('/api/admin/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name.trim(), sku: sku.trim().toUpperCase(), unit, type, category: category || null }),
            });
            const d = await res.json();
            if (d.success) {
                onCreated({ id: d.data.id, name: d.data.name, sku: d.data.sku, unit: d.data.unit, type: d.data.type });
            } else {
                setErr(d.error || 'Error al crear producto');
            }
        } catch { setErr('Error de conexión'); }
        finally { setSaving(false); }
    }

    // Generar SKU sugerido a partir del nombre
    function suggestSku(n: string) {
        return n.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) + '-' + Date.now().toString().slice(-4);
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-md">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <h2 className="font-bold text-white/90 flex items-center gap-2">
                        <Plus className="h-5 w-5 text-green-600" /> Nuevo Producto
                    </h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 border border-white/10 backdrop-blur-md/10 text-white/40 hover:text-white/70 transition">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <form onSubmit={handleCreate} className="p-6 space-y-4">
                    {err && (
                        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 flex-shrink-0" /> {err}
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-semibold text-white/70 mb-1">Nombre *</label>
                        <input required type="text" value={name} onChange={e => { setName(e.target.value); if (!sku) setSku(suggestSku(e.target.value)); }}
                            placeholder="Ej: Harina de trigo"
                            className="w-full border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-white/70 mb-1">SKU *</label>
                            <input required type="text" value={sku} onChange={e => setSku(e.target.value.toUpperCase())}
                                placeholder="HARINA-1"
                                className="w-full border border-white/10 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-300" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-white/70 mb-1">Unidad *</label>
                            <select value={unit} onChange={e => setUnit(e.target.value)}
                                className="w-full border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300">
                                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-white/70 mb-1">Tipo *</label>
                            <select value={type} onChange={e => setType(e.target.value)}
                                className="w-full border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300">
                                {PRODUCT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-white/70 mb-1">Categoría</label>
                            <input type="text" value={category} onChange={e => setCategory(e.target.value)}
                                placeholder="Lácteos, Carnes…"
                                className="w-full border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
                        </div>
                    </div>
                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose}
                            className="flex-1 border border-white/10 text-white/70 py-2.5 rounded-xl font-semibold text-sm hover:bg-white/5 transition">
                            Cancelar
                        </button>
                        <button type="submit" disabled={saving}
                            className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2.5 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            Crear Producto
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ── Página principal ───────────────────────────────────────────────────── */
export default function FactoryReceivingPage() {
    const { user } = useSession();

    const [branches, setBranches]     = useState<Branch[]>([]);
    const [branchId, setBranchId]     = useState('');
    const [supplier, setSupplier]     = useState('');
    const [invoiceRef, setInvoiceRef] = useState('');
    const [formNotes, setFormNotes]   = useState('');
    const [items, setItems]           = useState<ReceiptItem[]>([
        { productId: '', productName: '', unit: '', quantity: '', notes: '' },
    ]);

    // Catálogo completo de productos
    const [allProducts, setAllProducts]     = useState<Product[]>([]);
    const [productsLoading, setProductsLoading] = useState(true);
    const [productSearch, setProductSearch] = useState<Record<number, string>>({});
    const [productDropdown, setProductDropdown] = useState<number | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [showNewProduct, setShowNewProduct] = useState(false);
    const [newProductForRow, setNewProductForRow] = useState<number | null>(null);

    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast]           = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    const [history, setHistory]           = useState<HistoryReceipt[]>([]);
    const [histLoading, setHistLoading]   = useState(false);
    const [expandedRef, setExpandedRef]   = useState<string | null>(null);

    function showToast(type: 'success' | 'error', msg: string) {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 4500);
    }

    // Cerrar dropdown al hacer click afuera
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setProductDropdown(null);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // ── Carga de sucursales FABRICA ──────────────────────────────────────────
    useEffect(() => {
        fetch('/api/admin/branches').then(r => r.json()).then(d => {
            if (d.success) {
                const fab = (d.data as Branch[]).filter(b => b.type === 'FABRICA');
                setBranches(fab);
                const userBranch = fab.find(b => user?.branchIds?.includes(b.id));
                if (userBranch) setBranchId(userBranch.id);
                else if (fab.length === 1) setBranchId(fab[0].id);
            }
        });
    }, [user]);

    // ── Carga del CATÁLOGO completo (no solo los que tienen stock) ───────────
    const loadProducts = useCallback(async () => {
        setProductsLoading(true);
        try {
            const res = await fetch('/api/admin/products').then(r => r.json());
            if (res.success) {
                // Ordenar: activos primero, luego por nombre
                const sorted = (res.data as Product[])
                    .filter((p: any) => p.active !== false)
                    .sort((a: Product, b: Product) => a.name.localeCompare(b.name));
                setAllProducts(sorted);
            }
        } finally { setProductsLoading(false); }
    }, []);

    useEffect(() => { loadProducts(); }, [loadProducts]);

    const loadHistory = useCallback(async () => {
        if (!branchId) return;
        setHistLoading(true);
        const res = await fetch(`/api/inventory/receiving?branchId=${branchId}&limit=30`).then(r => r.json());
        if (res.success) setHistory(res.data);
        setHistLoading(false);
    }, [branchId]);

    useEffect(() => { loadHistory(); }, [loadHistory]);

    // ── Items ────────────────────────────────────────────────────────────────
    function addItem() {
        setItems(prev => [...prev, { productId: '', productName: '', unit: '', quantity: '', notes: '' }]);
    }
    function removeItem(i: number) {
        setItems(prev => prev.filter((_, idx) => idx !== i));
        setProductSearch(prev => { const n = { ...prev }; delete n[i]; return n; });
    }
    function updateItem(i: number, field: keyof ReceiptItem, value: string) {
        setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
    }
    function selectProduct(i: number, prod: Product) {
        updateItem(i, 'productId', prod.id);
        updateItem(i, 'productName', prod.name);
        updateItem(i, 'unit', prod.unit);
        setProductSearch(prev => ({ ...prev, [i]: prod.name }));
        setProductDropdown(null);
    }

    function filteredProducts(search: string): Product[] {
        const q = search.toLowerCase();
        if (!q) return allProducts.slice(0, 15);
        return allProducts
            .filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
            .slice(0, 15);
    }

    function handleNewProduct(rowIdx: number) {
        setNewProductForRow(rowIdx);
        setShowNewProduct(true);
        setProductDropdown(null);
    }

    function handleProductCreated(prod: Product) {
        setAllProducts(prev => [prod, ...prev].sort((a, b) => a.name.localeCompare(b.name)));
        setShowNewProduct(false);
        if (newProductForRow !== null) selectProduct(newProductForRow, prod);
        setNewProductForRow(null);
        showToast('success', `✅ Producto "${prod.name}" creado y seleccionado`);
    }

    // ── Submit ───────────────────────────────────────────────────────────────
    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!branchId) return showToast('error', 'Seleccioná un almacén destino');
        if (!supplier.trim()) return showToast('error', 'Ingresá el proveedor');
        const validItems = items.filter(it => it.productId && parseFloat(it.quantity) > 0);
        if (validItems.length === 0) return showToast('error', 'Agregá al menos un producto con cantidad');

        setSubmitting(true);
        try {
            const res = await fetch('/api/inventory/receiving', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    branchId,
                    supplier: supplier.trim(),
                    invoiceRef: invoiceRef.trim() || undefined,
                    receivedBy: user?.userId,
                    notes: formNotes.trim() || undefined,
                    items: validItems.map(it => ({
                        productId: it.productId, quantity: parseFloat(it.quantity), notes: it.notes || undefined,
                    })),
                }),
            });
            const d = await res.json();
            if (d.success) {
                showToast('success', `✅ ${d.message} — Ref: ${d.reference}`);
                setSupplier(''); setInvoiceRef(''); setFormNotes('');
                setProductSearch({}); setItems([{ productId: '', productName: '', unit: '', quantity: '', notes: '' }]);
                loadHistory();
            } else showToast('error', d.error || 'Error al registrar');
        } catch { showToast('error', 'Error de conexión'); }
        finally { setSubmitting(false); }
    }

    return (
        <div className="min-h-screen relative overflow-hidden" style={{ background: 'radial-gradient(ellipse at 60% 20%, #2d0a3e 0%, #0a0a0f 55%, #1a0508 100%)' }}>
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(192,38,211,0.2) 0%, transparent 70%)' }} />
                <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.15) 0%, transparent 70%)' }} />
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 66L0 50V16L28 0l28 16v34L28 66z' fill='none' stroke='%23fff' stroke-width='1'/%3E%3C/svg%3E\")", backgroundSize: '56px 100px' }} />
            </div>
            <div className="relative z-10 h-full w-full">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {toast.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {toast.msg}
                </div>
            )}

            {/* Modal */}
            {showNewProduct && (
                <QuickProductModal
                    onClose={() => { setShowNewProduct(false); setNewProductForRow(null); }}
                    onCreated={handleProductCreated}
                />
            )}

            {/* Header */}
            <div className="bg-white/5 border border-white/10 backdrop-blur-md border-b border-white/10 px-6 py-5">
                <div className="max-w-6xl mx-auto">
                    <Link href="/factory" className="text-sm text-white/60 hover:text-white/80 flex items-center gap-1 mb-1">
                        <ArrowLeft className="h-4 w-4" /> Volver a Fábrica
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="bg-green-100 rounded-xl p-2.5">
                            <PackagePlus className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white/90">Recepción de Mercancía</h1>
                            <p className="text-sm text-white/60 mt-0.5">
                                Registrá la entrada de productos al almacén ·{' '}
                                {productsLoading
                                    ? <span className="text-white/40">cargando catálogo…</span>
                                    : <span className="text-green-600 font-semibold">{allProducts.length} productos disponibles</span>
                                }
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ── Formulario ── */}
                <div className="lg:col-span-2 space-y-4">
                    <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl shadow-sm border border-white/10 p-6 space-y-5">

                        {/* Encabezado del remito */}
                        <div>
                            <h2 className="font-bold text-white/90 mb-4 flex items-center gap-2">
                                <Truck className="h-5 w-5 text-white/60" /> Datos del remito
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-white/70 mb-1">Almacén destino *</label>
                                    <select required value={branchId} onChange={e => setBranchId(e.target.value)}
                                        className="w-full border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300">
                                        <option value="">Seleccioná…</option>
                                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-semibold text-white/70 mb-1">Proveedor *</label>
                                    <input required type="text" value={supplier} onChange={e => setSupplier(e.target.value)}
                                        placeholder="Nombre del proveedor o empresa…"
                                        className="w-full border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-white/70 mb-1">N° Factura / Remito</label>
                                    <input type="text" value={invoiceRef} onChange={e => setInvoiceRef(e.target.value)} placeholder="FAC-0001"
                                        className="w-full border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-semibold text-white/70 mb-1">Observaciones</label>
                                    <input type="text" value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Opcional…"
                                        className="w-full border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
                                </div>
                            </div>
                        </div>

                        {/* Líneas de producto */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="font-bold text-white/90 flex items-center gap-2">
                                    <Package className="h-5 w-5 text-white/60" /> Productos recibidos
                                </h2>
                                <button type="button" onClick={() => { setNewProductForRow(null); setShowNewProduct(true); }}
                                    className="flex items-center gap-1.5 text-xs text-green-600 hover:text-green-700 font-semibold bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition">
                                    <Plus className="h-3.5 w-3.5" /> Nuevo producto
                                </button>
                            </div>

                            <div className="space-y-3" ref={dropdownRef}>
                                {items.map((item, i) => (
                                    <div key={i} className="border border-white/10 rounded-xl p-3 bg-white/5/50 space-y-2">
                                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">

                                            {/* Búsqueda producto */}
                                            <div className="sm:col-span-5 relative">
                                                <label className="block text-xs text-white/60 mb-1">Producto *</label>
                                                <div className="relative">
                                                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-white/40" />
                                                    <input
                                                        type="text"
                                                        value={productSearch[i] ?? item.productName}
                                                        onChange={e => {
                                                            setProductSearch(prev => ({ ...prev, [i]: e.target.value }));
                                                            setProductDropdown(i);
                                                            if (!e.target.value) { updateItem(i, 'productId', ''); updateItem(i, 'productName', ''); }
                                                        }}
                                                        onFocus={() => setProductDropdown(i)}
                                                        placeholder={productsLoading ? 'Cargando…' : 'Buscar producto…'}
                                                        disabled={productsLoading}
                                                        className="w-full pl-8 pr-3 py-2 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-300 bg-white/5 border border-white/10 backdrop-blur-md disabled:opacity-60"
                                                    />
                                                </div>

                                                {/* Dropdown */}
                                                {productDropdown === i && (
                                                    <div className="absolute z-20 top-full left-0 right-0 bg-white/5 border border-white/10 backdrop-blur-md border border-white/10 rounded-xl shadow-lg max-h-60 overflow-y-auto mt-1">
                                                        {filteredProducts(productSearch[i] ?? '').map(prod => (
                                                            <button key={prod.id} type="button"
                                                                onMouseDown={() => selectProduct(i, prod)}
                                                                className="w-full text-left px-3 py-2.5 hover:bg-green-50 flex items-center justify-between gap-2 border-b border-gray-50 last:border-0">
                                                                <div>
                                                                    <p className="text-sm font-medium text-white/90">{prod.name}</p>
                                                                    <p className="text-xs text-white/40">{prod.sku} · {TYPE_LABEL[prod.type] ?? prod.type}</p>
                                                                </div>
                                                                <span className="text-xs text-white/40 flex-shrink-0">{prod.unit}</span>
                                                            </button>
                                                        ))}
                                                        {/* Botón crear nuevo */}
                                                        <button type="button"
                                                            onMouseDown={() => handleNewProduct(i)}
                                                            className="w-full text-left px-3 py-2.5 text-green-600 hover:bg-green-50 flex items-center gap-2 font-semibold text-sm border-t border-white/10">
                                                            <Plus className="h-4 w-4 flex-shrink-0" />
                                                            {productSearch[i] ? `Crear "${productSearch[i]}"` : 'Crear nuevo producto'}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Cantidad */}
                                            <div className="sm:col-span-3">
                                                <label className="block text-xs text-white/60 mb-1">
                                                    Cantidad{item.unit ? ` (${item.unit})` : ''} *
                                                </label>
                                                <input type="number" min="0.001" step="0.001" value={item.quantity}
                                                    onChange={e => updateItem(i, 'quantity', e.target.value)}
                                                    placeholder=""
                                                    className="w-full px-3 py-2 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-300 bg-white/5 border border-white/10 backdrop-blur-md" />
                                            </div>

                                            {/* Nota */}
                                            <div className="sm:col-span-3">
                                                <label className="block text-xs text-white/60 mb-1">Nota</label>
                                                <input type="text" value={item.notes}
                                                    onChange={e => updateItem(i, 'notes', e.target.value)}
                                                    placeholder="Opcional"
                                                    className="w-full px-3 py-2 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-300 bg-white/5 border border-white/10 backdrop-blur-md" />
                                            </div>

                                            {/* Eliminar */}
                                            <div className="sm:col-span-1 flex items-end justify-center pb-0.5">
                                                <button type="button" onClick={() => removeItem(i)}
                                                    disabled={items.length === 1}
                                                    className="p-2 text-white/40 hover:text-red-500 disabled:opacity-30 transition rounded-lg hover:bg-red-50">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Preview nuevo stock */}
                                        {item.productId && (
                                            <p className="text-xs text-white/40 pl-1">
                                                {item.quantity && parseFloat(item.quantity) > 0 ? (
                                                    <span className="text-green-600 font-semibold">
                                                        + {parseFloat(item.quantity).toFixed(3)} {item.unit} → stock actualizado al confirmar
                                                    </span>
                                                ) : (
                                                    <span>Ingresá la cantidad a recibir</span>
                                                )}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <button type="button" onClick={addItem}
                                className="mt-3 flex items-center gap-2 text-sm text-green-600 hover:text-green-700 font-medium px-3 py-2 rounded-xl hover:bg-green-50 transition">
                                <Plus className="h-4 w-4" /> Agregar otro producto
                            </button>
                        </div>

                        <button type="submit" disabled={submitting}
                            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-3.5 rounded-xl font-bold transition flex items-center justify-center gap-2 text-sm">
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4" />}
                            Confirmar Recepción de Mercancía
                        </button>
                    </form>
                </div>

                {/* ── Historial ── */}
                <div className="lg:col-span-1">
                    <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl shadow-sm border border-white/10 p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-bold text-white/90 flex items-center gap-2">
                                <ClipboardCheck className="h-5 w-5 text-white/60" /> Últimas entradas
                            </h2>
                            <button onClick={loadHistory} disabled={histLoading} className="p-1 text-white/40 hover:text-white/70 transition">
                                <RefreshCw className={`h-4 w-4 ${histLoading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        {histLoading ? (
                            <div className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto text-white/40" /></div>
                        ) : history.length === 0 ? (
                            <div className="text-center py-10 text-white/40">
                                <PackagePlus className="h-10 w-10 mx-auto mb-2 opacity-30" />
                                <p className="text-xs">Sin entradas registradas{!branchId && ' — seleccioná un almacén'}</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[600px] overflow-y-auto">
                                {history.map(rec => (
                                    <div key={rec.reference} className="border border-white/10 rounded-xl overflow-hidden">
                                        <button onClick={() => setExpandedRef(p => p === rec.reference ? null : rec.reference)}
                                            className="w-full text-left px-3 py-3 hover:bg-white/5 transition flex items-center justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="font-semibold text-white/90 text-sm truncate">{rec.supplier}</p>
                                                <p className="text-xs text-white/40 font-mono">{rec.reference}</p>
                                                <p className="text-xs text-white/40">
                                                    {new Date(rec.date).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' })}
                                                    {' · '}{rec.itemsCount} prod.
                                                </p>
                                            </div>
                                            {expandedRef === rec.reference
                                                ? <ChevronUp className="h-4 w-4 text-white/40 flex-shrink-0" />
                                                : <ChevronDown className="h-4 w-4 text-white/40 flex-shrink-0" />}
                                        </button>
                                        {expandedRef === rec.reference && (
                                            <div className="border-t border-white/10 divide-y divide-gray-50">
                                                {rec.items.map(it => (
                                                    <div key={it.id} className="px-3 py-2 bg-green-50/40 flex items-center justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-medium text-white/90 truncate">{it.product.name}</p>
                                                            <p className="text-xs text-white/40">{it.product.sku}</p>
                                                        </div>
                                                        <div className="text-right flex-shrink-0">
                                                            <p className="text-sm font-bold text-green-700">+{it.quantity} {it.product.unit}</p>
                                                            <p className="text-xs text-white/40">{it.previousStock.toFixed(1)} → {it.newStock.toFixed(1)}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    </div>
        );
}
