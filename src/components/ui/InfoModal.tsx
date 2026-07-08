'use client'

import { useTiendaStore } from '@/lib/store'
import { X, MapPin, Phone, Info, Server } from 'lucide-react'

export default function InfoModal() {
  const { isInfoModalOpen, setInfoModalOpen, config, empresa } = useTiendaStore()

  if (!isInfoModalOpen) return null
  
  const telefonoStr = empresa?.telefono || config?.whatsapp || '51970560023';
  const whatsappFormateado = `+${telefonoStr.slice(0, 2)} ${telefonoStr.slice(2)}`;
  const ubicacion = empresa?.direccionFiscal || config?.ubicacion || 'Av. Principal 123, Ciudad (Reemplazar con tu dirección)';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={() => setInfoModalOpen(false)}
      ></div>

      {/* Modal Content */}
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-300">
        
        {/* Header (Gradient) */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 text-white flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Info className="w-6 h-6" />
            Información
          </h2>
          <button 
            onClick={() => setInfoModalOpen(false)}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          
          {/* Store Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">
              Sobre la Tienda
            </h3>
            
            <div className="flex items-start gap-3 text-slate-600 dark:text-slate-400">
              <MapPin className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-300">Ubicación</p>
                <p className="text-sm">{ubicacion}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-slate-600 dark:text-slate-400">
              <Phone className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-300">Contacto Directo</p>
                <p className="text-sm">{whatsappFormateado}</p>
              </div>
            </div>
            
            {config?.mapaIframe && (
              <div className="mt-4 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 h-48 w-full relative">
                <div 
                  className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:border-0"
                  dangerouslySetInnerHTML={{ __html: config.mapaIframe }} 
                />
              </div>
            )}
          </div>

          {/* System Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">
              Sobre el Sistema
            </h3>
            
            <div className="flex items-start gap-3 text-slate-600 dark:text-slate-400">
              <Server className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
              <div className="text-sm space-y-1">
                <p>Este catálogo es una extensión del <strong>Punto de Venta Local (POS)</strong>.</p>
                <p>Los productos y la disponibilidad se sincronizan directamente desde caja.</p>
                <p className="text-xs text-slate-400 mt-2">Versión del Sistema: 1.0.0 (Catálogo Público)</p>
              </div>
            </div>
          </div>

        </div>
        
        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 text-center">
          <button 
            onClick={() => setInfoModalOpen(false)}
            className="px-6 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-full font-medium transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  )
}
