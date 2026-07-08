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
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">Directorio de Contactos Útiles</h3>
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
export function AvisosSection({ comunidad }: { comunidad: ComunidadConfig }) {
  if (!comunidad || !comunidad.avisos || comunidad.avisos.length === 0) return null;

  return (
    <div className="mb-8 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <AlertCircle className="w-5 h-5 text-indigo-500" />
        <h3 className="text-xl font-bold text-slate-800 dark:text-white">Avisos Importantes</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {comunidad.avisos.map(aviso => (
          <div key={aviso.id} className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 border-l-4 border-indigo-500 rounded-r-xl p-4 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-bold text-indigo-900 dark:text-indigo-400 text-lg">{aviso.titulo}</h4>
              <span className="text-xs font-semibold px-2 py-1 bg-white/50 dark:bg-black/20 rounded-md text-indigo-700 dark:text-indigo-300">{aviso.fecha}</span>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{aviso.contenido}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export function AnunciosSection({ comunidad }: { comunidad: ComunidadConfig }) {
  if (!comunidad || !comunidad.anuncios || comunidad.anuncios.length === 0) return null;

  return (
    <div className="mb-8 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg text-emerald-600 dark:text-emerald-400">
          <Info className="w-4 h-4" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 dark:text-white">Anuncios y Servicios</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {comunidad.anuncios.map(anuncio => (
          <div key={anuncio.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
            <h4 className="font-bold text-slate-800 dark:text-white text-base mb-1">{anuncio.nombre}</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 flex-1">{anuncio.descripcion}</p>
            <a 
              href={`https://wa.me/51${anuncio.telefono.replace(/\s+/g, '')}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="mt-auto flex items-center justify-center gap-2 w-full py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-sm font-semibold transition-colors"
            >
              <Phone className="w-4 h-4" />
              Contactar: {anuncio.telefono}
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
