'use client'

import React from 'react';
import { useTiendaStore } from '@/lib/store';
import { X, Trash2, Send } from 'lucide-react';
import Image from 'next/image';

export default function CartModal() {
  const { 
    isCartModalOpen, 
    setCartModalOpen, 
    consultaList, 
    removeFromConsulta,
    clearConsulta,
    config, 
    empresa 
  } = useTiendaStore();

  if (!isCartModalOpen) return null;

  const handleConsultar = async () => {
    if (consultaList.length === 0) return;
    
    // Log analytics
    try {
      const { logAnalyticsEvent } = await import('@/lib/actions');
      await logAnalyticsEvent('whatsapp_click', {
        source: 'cart_modal',
        itemCount: consultaList.length
      });
    } catch (e) {
      console.warn('Analytics error', e);
    }

    const numero = config?.whatsapp || empresa?.telefono || "51970560023";
    let mensaje = "Hola, me interesa consultar el precio y disponibilidad de estos productos:%0A%0A";
    
    consultaList.forEach((p, index) => {
      mensaje += `${index + 1}. ${p.nombre}%0A`;
    });
    
    window.open(`https://wa.me/${numero}?text=${mensaje}`, '_blank');
    
    // Opcional: Cerrar el modal después de enviar
    setCartModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Overlay para cerrar haciendo click afuera */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={() => setCartModalOpen(false)}
      ></div>
      
      {/* Modal Side-over (Sidebar derecho) */}
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col animate-slide-in-right border-l border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            Mi Lista de Compras
            <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 text-xs py-0.5 px-2 rounded-full">
              {consultaList.length} items
            </span>
          </h2>
          <button 
            onClick={() => setCartModalOpen(false)}
            className="p-2 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body (Lista de productos) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {consultaList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">🛒</span>
              </div>
              <p>Tu lista está vacía.</p>
              <button 
                onClick={() => setCartModalOpen(false)}
                className="mt-4 text-emerald-500 hover:underline font-medium"
              >
                Explorar productos
              </button>
            </div>
          ) : (
            consultaList.map((producto) => (
              <div key={producto.id} className="flex gap-4 p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-sm items-center">
                <div className="relative w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden flex-shrink-0">
                  {producto.imagenUrl ? (
                    <Image 
                      src={producto.imagenUrl} 
                      alt={producto.nombre} 
                      fill 
                      sizes="64px"
                      className="object-cover" 
                      unoptimized 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      🛒
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{producto.nombre}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{producto.categoria}</p>
                </div>
                
                <button 
                  onClick={() => removeFromConsulta(producto.id)}
                  className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 rounded-full transition-colors flex-shrink-0"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {consultaList.length > 0 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
            <button 
              onClick={clearConsulta}
              className="w-full py-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors font-medium"
            >
              Vaciar lista
            </button>
            <button 
              onClick={handleConsultar}
              className="w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-[#25D366]/30 transition-all flex items-center justify-center gap-2 transform active:scale-95"
            >
              <Send className="w-5 h-5" />
              Enviar pedido por WhatsApp
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
