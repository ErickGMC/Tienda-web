'use client';

/**
 * IAComboModal.tsx
 * Modal del Armador de Combos en 1-Clic (Nivel 3 del RAG).
 *
 * El usuario escribe una solicitud en lenguaje natural:
 *  "Lonchera escolar 3 días con S/ 20"
 *  "Ingredientes para ceviche de 4 personas"
 *  "Kit de limpieza del baño económico"
 *
 * La IA retorna un combo estructurado con productos reales de Firestore.
 * El usuario puede agregar todo el combo a su consulta con 1 clic.
 */

import { useState, useRef, useEffect } from 'react';
import { Sparkles, X, ShoppingCart, Loader2, ChevronRight, AlertCircle } from 'lucide-react';
import { useTiendaStore } from '@/lib/store';
import type { ComboResponse, ProductoCombo } from '@/app/api/combos-ia/route';
import Image from 'next/image';

interface IAComboModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUGERENCIAS = [
  'Lonchera escolar para 3 días con S/ 20',
  'Desayuno para 4 personas',
  'Ingredientes básicos para la semana',
  'Kit de snacks para una tarde de películas',
  'Bebidas para una reunión familiar',
];

export default function IAComboModal({ isOpen, onClose }: IAComboModalProps) {
  const { addToConsulta, showToast } = useTiendaStore();
  const [solicitud, setSolicitud] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [combo, setCombo] = useState<ComboResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [iaDeshabilitada, setIaDeshabilitada] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Focus al abrir y verificar estado de IA
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setCombo(null);
      setSolicitud('');
      setError(null);
      setIaDeshabilitada(false);
      // Verificar si los combos con IA están habilitados
      fetch('/api/ia-status', { cache: 'no-store' })
        .then(r => r.json())
        .then(data => {
          if (!data.iaCombosHabilitada) setIaDeshabilitada(true);
        })
        .catch(() => {}); // fail silently, el servidor devolverá 503 si es necesario
    }
  }, [isOpen]);

  const generarCombo = async (texto?: string) => {
    const terminoFinal = (texto || solicitud).trim();
    if (!terminoFinal || terminoFinal.length < 5) return;

    setIsLoading(true);
    setError(null);
    setCombo(null);

    try {
      const res = await fetch('/api/combos-ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solicitud: terminoFinal }),
      });

      if (res.status === 503) {
        setError('El servicio de IA está temporalmente deshabilitado desde la administración de la tienda.');
        return;
      }

      if (!res.ok) throw new Error('Error al generar combo');

      const data: ComboResponse = await res.json();
      setCombo(data);
    } catch (err) {
      setError('Hubo un error al procesar tu solicitud. Por favor intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const agregarTodoAlCarrito = () => {
    if (!combo) return;
    // Agrega cada producto al carrito la cantidad indicada de veces
    combo.productos.forEach((p: ProductoCombo) => {
      addToConsulta({
        id: p.id,
        nombre: p.nombre,
        precio: p.precio,
        imagenUrl: p.imagenUrl,
        descripcion: '',
        categoria: 'Otros',
        unidadMedida: 'unidad',
        disponible: true,
        destacado: false,
      });
    });
    showToast(`🛒 ${combo.titulo} agregado a tu consulta`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="relative p-5 pb-4 bg-gradient-to-br from-violet-600 to-indigo-700 flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Armar Compra con IA</h2>
              <p className="text-violet-200 text-xs font-medium">Describe lo que necesitas y armamos tu carrito</p>
            </div>
          </div>
        </div>

        {/* ── Body ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Estado: IA de Combos Deshabilitada */}
          {iaDeshabilitada && (
            <div className="py-8 flex flex-col items-center gap-4 text-center">
              <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-slate-300" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  Servicio no disponible
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  El armador de combos con IA está temporalmente deshabilitado desde la administración de la tienda.
                </p>
              </div>
            </div>
          )}

          {/* Área de solicitud */}
          {!iaDeshabilitada && !combo && !isLoading && (
            <>
              <div>
                <textarea
                  ref={inputRef}
                  value={solicitud}
                  onChange={(e) => setSolicitud(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      generarCombo();
                    }
                  }}
                  placeholder="Ej: Lonchera escolar para 3 días con S/ 20..."
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:focus:ring-violet-900 transition-all"
                />
              </div>

              {/* Sugerencias rápidas */}
              <div>
                <p className="text-xs font-bold text-slate-400 mb-2">💡 Ideas rápidas</p>
                <div className="flex flex-wrap gap-2">
                  {SUGERENCIAS.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setSolicitud(s);
                        generarCombo(s);
                      }}
                      className="text-xs px-3 py-1.5 rounded-full bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700 hover:bg-violet-100 dark:hover:bg-violet-800 transition-all font-medium"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}
            </>
          )}

          {/* Loading */}
          {!iaDeshabilitada && isLoading && (
            <div className="py-10 flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                  <Loader2 className="w-7 h-7 text-violet-500 animate-spin" />
                </div>
                <div className="absolute -inset-1 rounded-full bg-violet-400/20 animate-ping" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Armando tu combo...</p>
                <p className="text-xs text-slate-400 mt-1">La IA está revisando nuestro catálogo 🛒</p>
              </div>
            </div>
          )}

          {/* Resultado del Combo */}
          {!iaDeshabilitada && combo && !isLoading && (
            <div className="space-y-4">
              {/* Header del combo */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 border border-violet-100 dark:border-violet-800">
                <h3 className="font-black text-slate-800 dark:text-slate-100 text-base">🎉 {combo.titulo}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{combo.descripcion}</p>
              </div>

              {/* Lista de productos */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                {combo.productos.map((prod: ProductoCombo) => (
                  <div key={prod.id} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                      {prod.imagenUrl ? (
                        <Image src={prod.imagenUrl} alt={prod.nombre} width={40} height={40} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 text-lg">📦</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{prod.nombre}</p>
                      <p className="text-xs text-slate-500">x{prod.cantidad}</p>
                    </div>
                    <span className="text-sm font-bold text-emerald-600 flex-shrink-0">
                      S/ {prod.subtotal.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
                <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Total estimado</span>
                <span className="text-lg font-black text-slate-800 dark:text-slate-100">
                  S/ {combo.totalEstimado.toFixed(2)}
                </span>
              </div>

              {/* Botón "Buscar otro" */}
              <button
                onClick={() => { setCombo(null); setSolicitud(''); }}
                className="w-full text-sm text-violet-500 hover:text-violet-700 font-medium py-2 transition-colors"
              >
                ← Hacer otra solicitud
              </button>
            </div>
          )}
        </div>

        {/* ── Footer con CTA ───────────────────────────────────────── */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex-shrink-0">
          {!iaDeshabilitada && !combo && !isLoading && (
            <button
              onClick={() => generarCombo()}
              disabled={solicitud.trim().length < 5}
              className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm
                bg-gradient-to-r from-violet-600 to-indigo-700 text-white
                hover:from-violet-700 hover:to-indigo-800 shadow-violet-200 dark:shadow-violet-900
                disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              <Sparkles className="w-4 h-4" />
              Generar Combo con IA
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {!iaDeshabilitada && combo && !isLoading && (
            <button
              onClick={agregarTodoAlCarrito}
              className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all
                bg-gradient-to-r from-emerald-500 to-teal-600 text-white
                hover:from-emerald-600 hover:to-teal-700 shadow-sm shadow-emerald-200 dark:shadow-emerald-900"
            >
              <ShoppingCart className="w-4 h-4" />
              Agregar Combo Completo a mi Consulta
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
