'use client';

import React from 'react';
import { Producto, PresentacionVariante } from '@/types/producto';
import { MessageCircle, Plus, Check, X, Layers, CheckCircle2, ShoppingBag, Sparkles } from 'lucide-react';
import { useTiendaStore } from '@/lib/store';

interface FamilyDetailModalProps {
  familia: Producto | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function FamilyDetailModal({ familia, isOpen, onClose }: FamilyDetailModalProps) {
  const { consultaList, addToConsulta, showPrices, empresa, config, showToast } = useTiendaStore();

  if (!isOpen || !familia) return null;

  const presentaciones: PresentacionVariante[] = familia.presentaciones || [];
  const debeMostrarPrecio = Boolean(showPrices && familia.mostrarPrecioWeb === true);

  const handleConsultarWhatsapp = (pres: PresentacionVariante) => {
    const numero = config?.whatsapp || empresa?.telefono || '51970560023';
    let mensaje = `Hola, quisiera consultar por el producto: *${familia.nombre}*`;
    mensaje += ` (Presentación: *${pres.etiqueta || pres.nombre}*${debeMostrarPrecio && pres.precio > 0 ? ` - S/ ${pres.precio.toFixed(2)}` : ''})`;
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`, '_blank');
  };

  const handleAddToList = (pres: PresentacionVariante) => {
    const prodItem: Producto = {
      ...familia,
      id: pres.id,
      nombre: `${familia.nombre} - ${pres.etiqueta || pres.nombre}`,
      precio: pres.precio,
      stock: pres.stock,
      unidadMedida: (pres.unidadMedida as any) || familia.unidadMedida,
      codigoBarras: pres.codigoBarras || familia.codigoBarras,
    };

    addToConsulta(prodItem);
    showToast(`✅ "${familia.nombre} (${pres.etiqueta || pres.nombre})" agregado a tu lista`);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-sm p-0 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border-t sm:border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle visual para móviles */}
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-2.5 sm:hidden" />

        {/* Encabezado del Modal */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/60 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-bold rounded-full border border-amber-500/30">
                {familia.categoria}
              </span>
              <span className="px-2.5 py-0.5 bg-purple-500/10 text-purple-700 dark:text-purple-300 text-xs font-bold rounded-full border border-purple-500/30 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" />
                {presentaciones.length} {presentaciones.length === 1 ? 'opción' : 'opciones'}
              </span>
            </div>

            <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
              {familia.nombre}
            </h2>

            {familia.descripcion && (
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                {familia.descripcion}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-200/70 hover:bg-slate-300/80 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full transition-colors cursor-pointer shrink-0"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo: Lista Ordenada de Presentaciones SIN IMÁGENES */}
        <div className="flex-1 p-3.5 sm:p-6 overflow-y-auto space-y-3 custom-scrollbar-light-light-light">
          <div className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
            <span>Presentaciones disponibles:</span>
            <span className="hidden sm:inline">Opciones de compra</span>
          </div>

          {presentaciones.length > 0 ? (
            presentaciones.map((pres, idx) => {
              const estaEnLista = consultaList.some(p => p.id === pres.id);

              return (
                <div
                  key={pres.id || idx}
                  className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-amber-400 dark:hover:border-amber-500 hover:shadow-md transition-all flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5"
                >
                  {/* Información de la Presentación (Alta legibilidad) */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-xs font-black flex items-center justify-center shrink-0 border border-amber-500/30">
                        {idx + 1}
                      </span>
                      <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-snug">
                        {pres.etiqueta || pres.nombre}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2.5 mt-2 ml-8 text-xs text-slate-600 dark:text-slate-300 flex-wrap">
                      {debeMostrarPrecio ? (
                        <div className="flex items-baseline gap-1">
                          <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
                            S/ {pres.precio.toFixed(2)}
                          </span>
                          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            / {pres.unidadMedida || familia.unidadMedida || 'und'}
                          </span>
                        </div>
                      ) : (
                        <span className="font-bold text-slate-700 dark:text-slate-200 bg-slate-200/80 dark:bg-slate-700/80 px-2 py-0.5 rounded-md text-[11px]">
                          Precio a consultar
                        </span>
                      )}

                      <span>•</span>

                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] sm:text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> En tienda
                      </span>
                    </div>
                  </div>

                  {/* Botones de Acción (Adaptados para móvil en cuadrícula de 2 columnas) */}
                  <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => handleConsultarWhatsapp(pres)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[#25D366] hover:bg-[#1ebe5d] active:scale-95 text-white text-xs font-extrabold rounded-xl transition-all shadow-sm cursor-pointer"
                      title="Consultar esta presentación por WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4 shrink-0" />
                      <span>WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddToList(pres)}
                      disabled={estaEnLista}
                      className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-extrabold transition-all shadow-sm cursor-pointer active:scale-95 ${
                        estaEnLista
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 cursor-not-allowed'
                          : 'bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white shadow-amber-500/20'
                      }`}
                      title={estaEnLista ? 'Ya está en tu lista' : 'Agregar a la lista'}
                    >
                      {estaEnLista ? (
                        <>
                          <Check className="w-4 h-4 shrink-0" />
                          <span>Agregado</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 shrink-0" />
                          <span>+ Agregar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400">
              <ShoppingBag className="w-10 h-10 opacity-50 mx-auto mb-2 text-amber-500" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Esta familia no tiene presentaciones configuradas actualmente.
              </p>
            </div>
          )}
        </div>

        {/* Pie del Modal con soporte móvil */}
        <div className="p-3.5 sm:p-4 bg-slate-100 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
          <span className="text-[11px] sm:text-xs">Toca para cotizar o armar tu pedido.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-xl border border-slate-300 dark:border-slate-600 font-bold transition-colors cursor-pointer"
          >
            Listo / Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
