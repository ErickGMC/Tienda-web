'use client'

import Link from 'next/link'
import { Store } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="w-24 h-24 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mb-8">
        <Store className="w-12 h-12 text-slate-400" />
      </div>
      <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-4">
        Página no encontrada
      </h2>
      <p className="text-lg text-slate-600 dark:text-slate-400 max-w-md mb-8">
        Lo sentimos, no pudimos encontrar el producto o la página que estás buscando. Puede que haya sido eliminada o que el enlace sea incorrecto.
      </p>
      <Link 
        href="/"
        className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-bold transition-colors shadow-lg shadow-emerald-500/30"
      >
        Volver al Catálogo
      </Link>
    </div>
  )
}
