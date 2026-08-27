'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Producto, PresentacionVariante } from '@/types/producto';
import { 
  MessageCircle, 
  Plus, 
  Check, 
  X, 
  Layers, 
  CheckCircle2, 
  ShoppingBag, 
  Search, 
  ArrowRight,
  Sparkles,
  ShoppingBag as CartIcon
} from 'lucide-react';
import Image from 'next/image';
import { useTiendaStore } from '@/lib/store';

interface FamilyDetailDrawerProps {
  familia: Producto | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function FamilyDetailDrawer({ familia, isOpen, onClose }: FamilyDetailDrawerProps) {
  const { consultaList, addToConsulta, removeFromConsulta, showPrices, empresa, config, showToast, setCartModalOpen } = useTiendaStore();
  const [filterText, setFilterText] = useState('');

  // Limpiar filtro al cambiar o abrir familia
  useEffect(() => {
    if (isOpen) {
      setFilterText('');
      // Bloquear scroll de fondo
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, familia?.id]);

  // Soporte para cerrar con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const presentaciones: PresentacionVariante[] = useMemo(() => {
    return (familia && familia.presentaciones) ? familia.presentaciones : [];
  }, [familia]);

  // Filtrado interno rápido
  const presentacionesFiltradas = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    if (!q) return presentaciones;
    return presentaciones.filter(p => 
      (p.etiqueta && p.etiqueta.toLowerCase().includes(q)) ||
      (p.nombre && p.nombre.toLowerCase().includes(q)) ||
      (p.codigoBarras && p.codigoBarras.toLowerCase().includes(q))
    );
  }, [presentaciones, filterText]);

  // Cuántos productos de esta familia están en la lista de cotización
  const itemsAgregadosDeEstaFamilia = useMemo(() => {
    const presentacionIds = new Set(presentaciones.map(p => p.id));
    return consultaList.filter(item => presentacionIds.has(item.id));
  }, [consultaList, presentaciones]);

  if (!isOpen || !familia) return null;

  const debeMostrarPrecio = Boolean(showPrices && familia.mostrarPrecioWeb === true);

  // Handler WhatsApp para una variante individual
  const handleConsultarWhatsappItem = (pres: PresentacionVariante, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const numero = config?.whatsapp || empresa?.telefono || '51970560023';
    let mensaje = `Hola, quisiera consultar por el producto: *${familia.nombre}*`;
    mensaje += `\nPresentación: *${pres.etiqueta || pres.nombre}*`;
    if (debeMostrarPrecio && pres.precio > 0) {
      mensaje += `\nPrecio: *S/ ${pres.precio.toFixed(2)}*`;
    }
    mensaje += `\n¿Tienen stock disponible en tienda?`;
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`, '_blank');
  };

  // Handler WhatsApp para toda la familia o lo seleccionado
  const handleConsultarWhatsappGlobal = () => {
    const numero = config?.whatsapp || empresa?.telefono || '51970560023';
    let mensaje = '';

    if (itemsAgregadosDeEstaFamilia.length > 0) {
      mensaje = `Hola, quisiera cotizar estas opciones de *${familia.nombre}*:\n`;
      itemsAgregadosDeEstaFamilia.forEach((item, idx) => {
        mensaje += `\n${idx + 1}. ${item.nombre}`;
        if (debeMostrarPrecio && item.precio > 0) {
          mensaje += ` - S/ ${item.precio.toFixed(2)}`;
        }
      });
      mensaje += `\n\n¿Me confirman disponibilidad y tiempo de entrega?`;
    } else {
      mensaje = `Hola, quisiera consultar por la línea de productos: *${familia.nombre}* (${familia.categoria}).`;
      if (presentaciones.length > 0) {
        mensaje += `\nOpciones disponibles: ${presentaciones.map(p => p.etiqueta || p.nombre).slice(0, 4).join(', ')}${presentaciones.length > 4 ? '...' : ''}`;
      }
      mensaje += `\n\n¿Qué presentaciones tienen listas para entrega hoy?`;
    }

    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`, '_blank');
  };

  // Agregar / Quitar de lista
  const handleToggleToList = (pres: PresentacionVariante, estaEnLista: boolean, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (estaEnLista) {
      removeFromConsulta(pres.id);
      showToast(`Removido: "${familia.nombre} (${pres.etiqueta || pres.nombre})"`);
    } else {
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
    }
  };

  const handleOpenCart = () => {
    onClose();
    setCartModalOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in">
      {/* Backdrop con Blur y Oscurecimiento */}
      <div 
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Contenedor Principal: Drawer Lateral en Desktop / Bottom Sheet en Móvil */}
      <div className="fixed inset-x-0 bottom-0 sm:inset-x-auto sm:inset-y-0 sm:right-0 max-h-[92vh] sm:max-h-full w-full sm:max-w-md md:max-w-lg lg:max-w-xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-t-none sm:rounded-l-3xl shadow-2xl border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-800 flex flex-col z-50 overflow-hidden animate-slide-in-right">
        
        {/* Handle visual para móviles */}
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />

        {/* ── CABECERA COMPACTA Y ELEGANTE ── */}
        <div className="p-3.5 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/70 backdrop-blur-md shrink-0">
          
          <div className="flex items-start justify-between gap-3 mb-2.5">
            {/* Badges de Categoría y Variantes */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11px] font-extrabold rounded-full border border-amber-500/20">
                {familia.categoria}
              </span>
              <span className="px-2.5 py-0.5 bg-purple-500/10 text-purple-700 dark:text-purple-300 text-[11px] font-extrabold rounded-full border border-purple-500/20 flex items-center gap-1">
                <Layers className="w-3 h-3" />
                {presentaciones.length} {presentaciones.length === 1 ? 'presentación' : 'presentaciones'}
              </span>
            </div>

            {/* Botón Cerrar */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-200/60 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full transition-colors cursor-pointer shrink-0"
              title="Cerrar panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Thumbnail y Título de la Familia */}
          <div className="flex items-center gap-3">
            {familia.imagenUrl ? (
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700 shadow-xs">
                <Image 
                  src={familia.imagenUrl} 
                  alt={familia.nombre}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                <span className="text-amber-600 dark:text-amber-400 font-black text-lg uppercase">
                  {familia.nombre.substring(0, 2)}
                </span>
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h2 className="text-base sm:text-xl font-black text-slate-900 dark:text-white leading-tight truncate">
                {familia.nombre}
              </h2>
              {familia.descripcion ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                  {familia.descripcion}
                </p>
              ) : (
                <p className="text-xs text-slate-400 dark:text-slate-500 italic mt-0.5">
                  Selecciona tu presentación para consultar o pedir
                </p>
              )}
            </div>
          </div>

          {/* Micro-buscador interno (Visible si tiene > 4 opciones) */}
          {presentaciones.length > 4 && (
            <div className="relative mt-3">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Filtrar por tamaño, volumen o tipo..."
                className="w-full pl-8.5 pr-8 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
              />
              {filterText && (
                <button
                  onClick={() => setFilterText('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

        </div>

        {/* ── CUERPO: LISTA ULTRA-COMPACTA DE ALTA DENSIDAD ── */}
        <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-1.5 custom-scrollbar">
          
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 mb-1">
            <span>Presentación ({presentacionesFiltradas.length})</span>
            <span>Precio y Acción</span>
          </div>

          {presentacionesFiltradas.length > 0 ? (
            presentacionesFiltradas.map((pres, idx) => {
              const estaEnLista = consultaList.some(p => p.id === pres.id);

              return (
                <div
                  key={pres.id || idx}
                  onClick={() => handleToggleToList(pres, estaEnLista)}
                  className={`group relative p-2.5 sm:p-3 rounded-2xl border transition-all duration-150 flex items-center justify-between gap-3 select-none cursor-pointer ${
                    estaEnLista
                      ? 'bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/40 dark:border-amber-500/40 shadow-xs'
                      : 'bg-slate-50/70 dark:bg-slate-800/50 hover:bg-slate-100/90 dark:hover:bg-slate-800/90 border-slate-200/80 dark:border-slate-700/60 hover:border-amber-400/60'
                  }`}
                >
                  {/* Columna Izquierda: Información de la variante */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 border ${
                        estaEnLista 
                          ? 'bg-amber-500 text-white border-amber-600' 
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600'
                      }`}>
                        {idx + 1}
                      </span>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                        {pres.etiqueta || pres.nombre}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 ml-7">
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">
                        <CheckCircle2 className="w-3 h-3 shrink-0" /> En tienda
                      </span>
                      <span>•</span>
                      <span>{pres.unidadMedida || familia.unidadMedida || 'und'}</span>
                    </div>
                  </div>

                  {/* Columna Derecha: Precio + Micro Acciones */}
                  <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                    {/* Precio */}
                    {debeMostrarPrecio ? (
                      <div className="text-right mr-1">
                        <span className="text-sm sm:text-base font-black text-slate-900 dark:text-emerald-400">
                          S/ {pres.precio.toFixed(2)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-700/60 px-2 py-0.5 rounded-md">
                        Consultar
                      </span>
                    )}

                    {/* Micro Botón WhatsApp individual */}
                    <button
                      type="button"
                      onClick={(e) => handleConsultarWhatsappItem(pres, e)}
                      className="p-2 text-slate-400 hover:text-[#25D366] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition-all cursor-pointer"
                      title="Consultar solo esta presentación por WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>

                    {/* Botón Compacto Agregar / Agregado */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleToList(pres, estaEnLista, e)}
                      className={`flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs ${
                        estaEnLista
                          ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20'
                          : 'bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white shadow-amber-500/20'
                      }`}
                      title={estaEnLista ? 'Clic para remover de la lista' : 'Agregar a la lista'}
                    >
                      {estaEnLista ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span className="hidden sm:inline">Listo</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Agregar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
              <ShoppingBag className="w-8 h-8 opacity-40 mx-auto mb-2 text-amber-500" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {filterText 
                  ? `No hay opciones que coincidan con "${filterText}"`
                  : 'Esta familia no tiene presentaciones configuradas.'}
              </p>
              {filterText && (
                <button
                  type="button"
                  onClick={() => setFilterText('')}
                  className="mt-2 text-xs font-bold text-amber-600 dark:text-amber-400 underline"
                >
                  Ver todas las opciones
                </button>
              )}
            </div>
          )}

        </div>

        {/* ── PIE FIJO (STICKY FOOTER): ACCIONES GLOBALES Y RESUMEN ── */}
        <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-800 shrink-0 space-y-2.5 shadow-lg">
          
          {/* Barra de Estado / Resumen */}
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
            <span className="text-[11px] sm:text-xs">
              {itemsAgregadosDeEstaFamilia.length > 0 ? (
                <strong className="text-amber-600 dark:text-amber-400 font-extrabold">
                  {itemsAgregadosDeEstaFamilia.length} {itemsAgregadosDeEstaFamilia.length === 1 ? 'opción agregada' : 'opciones agregadas'}
                </strong>
              ) : (
                'Toca "+ Agregar" para cotizar o pedir'
              )}
            </span>

            {consultaList.length > 0 && (
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                Total en lista: <span className="text-slate-900 dark:text-white font-black">{consultaList.length}</span>
              </span>
            )}
          </div>

          {/* Botones de Acción Consolidados */}
          <div className="grid grid-cols-2 gap-2">
            
            {/* Botón WhatsApp Consolidado */}
            <button
              type="button"
              onClick={handleConsultarWhatsappGlobal}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[#25D366] hover:bg-[#1ebe5d] active:scale-95 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-[#25D366]/20 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span className="truncate">
                {itemsAgregadosDeEstaFamilia.length > 0 ? 'Consultar Selección' : 'Consultar WhatsApp'}
              </span>
            </button>

            {/* Botón Ver Lista / Carrito */}
            <button
              type="button"
              onClick={handleOpenCart}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 active:scale-95 text-xs font-black rounded-xl transition-all shadow-md cursor-pointer"
            >
              <CartIcon className="w-4 h-4 shrink-0 text-amber-500" />
              <span className="truncate">
                Ver Mi Lista {consultaList.length > 0 ? `(${consultaList.length})` : ''}
              </span>
            </button>

          </div>

        </div>

      </div>
    </div>
  );
}
