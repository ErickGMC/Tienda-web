'use client';

import React, { useState } from 'react';
import { Producto, PresentacionVariante } from '@/types/producto';
import { MessageCircle, Plus, Check, Star, Layers, CheckCircle2 } from 'lucide-react';
import { useTiendaStore } from '@/lib/store';

interface SearchResultCardProps {
  producto: Producto;
}

export default function SearchResultCard({ producto }: SearchResultCardProps) {
  const { consultaList, addToConsulta, showPrices, empresa, config, showToast } = useTiendaStore();
  const estaEnLista = consultaList.some(p => p.id === producto.id);

  // Presentaciones / Variantes
  const tienePresentaciones = Boolean(producto.presentaciones && producto.presentaciones.length > 0);
  const [selectedVariante, setSelectedVariante] = useState<PresentacionVariante | null>(
    tienePresentaciones ? producto.presentaciones![0] : null
  );

  // Control estricto de visualización de precios
  const debeMostrarPrecio = Boolean(showPrices && producto.mostrarPrecioWeb === true);
  const currentPrice = selectedVariante ? selectedVariante.precio : producto.precio;

  const handleConsultarWhatsapp = () => {
    const numero = config?.whatsapp || empresa?.telefono || '51970560023';
    let mensaje = `Hola, quisiera consultar por el producto: *${producto.nombre}*`;
    if (selectedVariante) {
      mensaje += ` (Presentación: *${selectedVariante.etiqueta}*${debeMostrarPrecio ? ` - S/ ${selectedVariante.precio.toFixed(2)}` : ''})`;
    }
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`, '_blank');
  };

  const handleAddToList = () => {
    addToConsulta(producto);
    showToast(`"${producto.nombre}${selectedVariante ? ` (${selectedVariante.etiqueta})` : ''}" agregado a tu lista`);
  };

  return (
    <div className="group relative flex flex-col justify-between bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 hover:border-amber-400 dark:hover:border-amber-500/50 hover:shadow-md transition-all duration-200">
      
      {/* Cabecera de la Tarjeta (Sin Imagen) */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] sm:text-xs font-semibold rounded-md">
              {producto.categoria}
            </span>
            {tienePresentaciones && (
              <span className="px-2 py-0.5 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-[10px] sm:text-xs font-bold rounded-md flex items-center gap-1 border border-purple-200 dark:border-purple-800">
                <Layers className="w-3 h-3" /> {producto.presentaciones!.length} Presentaciones
              </span>
            )}
            {producto.destacado && (
              <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 text-[10px] sm:text-xs font-bold rounded-md flex items-center gap-1 border border-amber-200 dark:border-amber-800">
                <Star className="w-3 h-3 fill-current" /> Destacado
              </span>
            )}
          </div>

          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" /> En stock
          </span>
        </div>

        {/* Nombre del Producto */}
        <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white leading-snug group-hover:text-amber-500 transition-colors mt-1">
          {producto.nombre}
        </h3>

        {/* Descripción (si tiene) */}
        {producto.descripcion && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
            {producto.descripcion}
          </p>
        )}

        {/* Variantes / Presentaciones en Chips interactivos */}
        {tienePresentaciones && (
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
            <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
              Seleccionar Presentación:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {producto.presentaciones!.map((pres) => {
                const isSelected = selectedVariante?.id === pres.id;
                return (
                  <button
                    key={pres.id}
                    type="button"
                    onClick={() => setSelectedVariante(pres)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-150 border cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                    }`}
                  >
                    {pres.etiqueta}
                    {debeMostrarPrecio ? ` • S/ ${pres.precio.toFixed(2)}` : ''}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Pie de Tarjeta: Precio y Acciones */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
        <div>
          {debeMostrarPrecio ? (
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-slate-900 dark:text-white">
                S/ {currentPrice.toFixed(2)}
              </span>
              <span className="text-[11px] text-slate-500">
                / {selectedVariante?.unidadMedida || producto.unidadMedida || 'und'}
              </span>
            </div>
          ) : (
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Disponible en tienda
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleConsultarWhatsapp}
            className="flex items-center gap-1 px-3 py-1.5 bg-[#25D366] hover:bg-[#1ebe5d] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
            title="Consultar por WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={handleAddToList}
            disabled={estaEnLista}
            className={`p-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center cursor-pointer active:scale-95 ${
              estaEnLista
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                : 'bg-amber-500 hover:bg-amber-600 text-white'
            }`}
            title={estaEnLista ? 'En tu lista' : 'Añadir a mi lista'}
          >
            {estaEnLista ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
