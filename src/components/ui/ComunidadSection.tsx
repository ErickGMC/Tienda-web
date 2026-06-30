'use client'

import { ComunidadConfig } from '@/lib/actions'
import { Phone, AlertCircle, Info } from 'lucide-react'

export function AvisoGlobal({ comunidad }: { comunidad: ComunidadConfig }) {
  if (!comunidad || !comunidad.avisoGlobal) return null;

  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium z-40 relative">
      <AlertCircle className="w-5 h-5 shrink-0" />
      <span className="text-center">{comunidad.avisoGlobal}</span>
    </div>
  )
}

export function TelefonosUtiles({ comunidad }: { comunidad: ComunidadConfig }) {
  if (!comunidad || !comunidad.telefonos || comunidad.telefonos.length === 0) return null;

  return (
    <div className="mt-12 mb-8 bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-center gap-3 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl">
          <Info className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">Directorio del Barrio</h3>
          <p className="text-sm text-slate-500">Teléfonos de emergencia y utilidad para nuestra comunidad.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {comunidad.telefonos.map(tel => (
          <a 
            key={tel.id} 
            href={`tel:${tel.numero}`}
            className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-500/30 hover:bg-blue-50/50 dark:hover:bg-blue-500/5 transition-all group"
          >
            <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-blue-500 group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20 transition-colors">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-sm text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">{tel.nombre}</p>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{tel.numero}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
