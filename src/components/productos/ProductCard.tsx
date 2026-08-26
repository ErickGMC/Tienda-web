'use client';

import React from 'react';
import { Producto } from '@/types/producto';
import { Layers, ArrowRight } from 'lucide-react';
import Image from 'next/image';

interface ProductCardProps {
  producto: Producto;
  onSelect?: (producto: Producto) => void;
}

export default function ProductCard({ producto, onSelect }: ProductCardProps) {
  const tienePresentaciones = Boolean(producto.presentaciones && producto.presentaciones.length > 0);
  const totalOpciones = producto.presentaciones ? producto.presentaciones.length : 0;

  const handleClick = () => {
    if (onSelect) {
      onSelect(producto);
    }
  };

  return (
    <div 
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      className="group relative flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-xl hover:border-amber-400 dark:hover:border-amber-500/50 hover:-translate-y-1 transition-all duration-300 ease-out cursor-pointer select-none"
    >
      {/* Área de Imagen Representativa */}
      <div className="relative aspect-square w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
        {producto.imagenUrl ? (
          <Image 
            src={producto.imagenUrl} 
            alt={producto.nombre}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-slate-100 dark:bg-slate-800/80 flex flex-col items-center justify-center p-4 text-center border-b border-slate-200 dark:border-slate-800">
            <span className="text-amber-500 font-bold text-3xl uppercase tracking-wider mb-1">
              {producto.nombre.substring(0, 2)}
            </span>
            <span className="text-[10px] text-slate-400 font-medium line-clamp-1 max-w-[80%]">
              {producto.categoria}
            </span>
          </div>
        )}
        
        {/* Badges de Categoría y Variantes */}
        <div className="absolute top-2 left-2 right-2 sm:top-3 sm:left-3 sm:right-3 flex items-center justify-between gap-1 pointer-events-none z-10">
          <div className="px-2 py-0.5 sm:px-3 sm:py-1 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-full text-[10px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm truncate max-w-[60%] sm:max-w-[65%]">
            {producto.categoria}
          </div>

          {tienePresentaciones && (
            <div className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-purple-600/90 backdrop-blur-sm rounded-full text-[10px] sm:text-xs font-bold text-white shadow-sm flex items-center gap-1 shrink-0">
              <Layers className="w-3 h-3 text-white shrink-0" />
              <span>{totalOpciones} {totalOpciones === 1 ? 'Opción' : 'Opciones'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Contenido: Título, Descripción y Llamado a la Acción (Sin Botones de Compra) */}
      <div className="p-3 sm:p-5 flex flex-col flex-1">
        <h3 className="font-bold text-sm sm:text-lg text-slate-900 dark:text-white line-clamp-2 mb-1 group-hover:text-amber-500 transition-colors">
          {producto.nombre}
        </h3>
        
        {producto.descripcion ? (
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">
            {producto.descripcion}
          </p>
        ) : (
          <p className="text-xs text-slate-400 italic mb-3">
            Línea de productos disponible en tienda
          </p>
        )}

        {/* Botón visual de llamado a la acción */}
        <div className="mt-auto pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400 group-hover:text-amber-500">
          <span>Ver presentaciones</span>
          <div className="w-7 h-7 rounded-full bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center group-hover:translate-x-1 transition-transform">
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
}
