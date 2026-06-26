'use client'

import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Aquí podríamos enviar el error a un servicio como Sentry si lo tuviéramos
    console.error("Application error:", error)
  }, [error])

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="w-24 h-24 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-8">
        <AlertCircle className="w-12 h-12 text-red-500" />
      </div>
      <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-4">
        ¡Ups! Algo salió mal
      </h2>
      <p className="text-slate-600 dark:text-slate-400 max-w-md mb-8">
        Ocurrió un error inesperado al cargar esta página. Estamos trabajando para solucionarlo.
      </p>
      <button
        onClick={() => reset()}
        className="px-8 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 dark:text-slate-900 text-white rounded-full font-bold transition-colors shadow-lg"
      >
        Intentar de nuevo
      </button>
    </div>
  )
}
