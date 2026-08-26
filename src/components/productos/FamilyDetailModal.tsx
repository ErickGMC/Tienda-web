'use client';

import React from 'react';
import { Producto, PresentacionVariante } from '@/types/producto';
import { MessageCircle, Plus, Check, X, Layers, CheckCircle2, ShoppingBag } from 'lucide-react';
import { useTiendaStore } from '@/lib/store';

interface FamilyDetailModalProps {
  familia: Producto | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function FamilyDetailModal({ familia, isOpen, onClose }: FamilyDetailModalProps) {
  const { consultaList, addToConsulta, showPrices, empresa, config, showToast } = useTiendaStore();

  if (!isOpen || !familia) return null;

  // Presentaciones de la familia
  const presentaciones: PresentacionVariante[] = familia.presentaciones || [];
  const debeMostrarPrecio = Boolean(showPrices && familia.mostrarPrecioWeb === true);

  const handleConsultarWhatsapp = (pres: PresentacionVariante) => {
    const numero = config?.whatsapp || empresa?.telefono || '51970560023';
    let mensaje = `Hola, quisiera consultar por el producto: *${familia.nombre}*`;
    mensaje += ` (Presentación: *${pres.etiqueta || pres.nombre}*${debeMostrarPrecio && pres.precio > 0 ? ` - S/ ${pres.precio.toFixed(2)}` : ''})`;
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`, '_blank');
  };

  const handleAddToList = (pres: PresentacionVariante) => {
    // Creamos un producto virtual para la lista de consulta que representa esta variante específica
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-fade-in">
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Encabezado del Modal */}
        <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-full border border-amber-500/20">
                {familia.categoria}
              </span>
              <span className="px-2.5 py-0.5 bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-bold rounded-full border border-purple-500/20 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" />
                {presentaciones.length} {presentaciones.length === 1 ? 'presentación' : 'presentaciones'}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
              {familia.nombre}
            </h2>

            {familia.descripcion && (
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                {familia.descripcion}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer shrink-0"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo: Lista Ordenada de Presentaciones SIN IMÁGENES */}
        <div className="flex-1 p-5 sm:p-6 overflow-y-auto space-y-3 custom-scrollbar-light-light-light">
          <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center justify-between">
            <span>Presentaciones y Variantes Disponibles:</span>
            <span>Acciones</span>
          </div>

          {presentaciones.length > 0 ? (
            presentaciones.map((pres, idx) => {
              const estaEnLista = consultaList.some(p => p.id === pres.id);

              return (
                <div
                  key={pres.id || idx}
                  className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 hover:border-amber-400 dark:hover:border-amber-500/50 hover:shadow-sm transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  {/* Información de la Presentación */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-snug">
                        {pres.etiqueta || pres.nombre}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2.5 mt-1.5 ml-8 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                      {debeMostrarPrecio ? (
                        <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
                          S/ {pres.precio.toFixed(2)}
                          <span className="text-[10px] font-normal text-slate-400 ml-1">
                            / {pres.unidadMedida || familia.unidadMedida || 'und'}
                          </span>
                        </span>
                      ) : (
                        <span className="font-semibold text-slate-600 dark:text-slate-300">
                          Consultar precio
                        </span>
                      )}

                      <span>•</span>

                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> En stock
                      </span>
                    </div>
                  </div>

                  {/* Botones de Acción (WhatsApp y Agregar a la Lista) */}
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => handleConsultarWhatsapp(pres)}
                      className="flex items-center gap-1 px-3 py-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
                      title="Consultar esta presentación por WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddToList(pres)}
                      disabled={estaEnLista}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 ${
                        estaEnLista
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 cursor-not-allowed'
                          : 'bg-amber-500 hover:bg-amber-600 text-white'
                      }`}
                      title={estaEnLista ? 'Ya en tu lista' : 'Agregar esta presentación a la lista'}
                    >
                      {estaEnLista ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Agregado</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Agregar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400">
              <ShoppingBag className="w-8 h-8 opacity-40 mx-auto mb-2 text-amber-500" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Esta familia no tiene presentaciones configuradas actualmente.
              </p>
            </div>
          )}
        </div>

        {/* Pie del Modal */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>Selecciona la presentación que deseas cotizar o consultar.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-300 dark:border-slate-700 font-bold transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
