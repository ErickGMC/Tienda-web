'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { useTiendaStore } from '@/lib/store'

export default function Toast() {
  const { toastMessage, isToastVisible } = useTiendaStore()
  const [render, setRender] = useState(false)
  const [animationClass, setAnimationClass] = useState('')

  useEffect(() => {
    if (isToastVisible) {
      setRender(true)
      setAnimationClass('animate-toast-in')
    } else if (render) {
      setAnimationClass('animate-toast-out')
      // Wait for animation to finish before removing from DOM
      const timer = setTimeout(() => setRender(false), 250)
      return () => clearTimeout(timer)
    }
  }, [isToastVisible, render])

  if (!render) return null

  return (
    <div className="fixed bottom-24 sm:bottom-10 left-1/2 transform -translate-x-1/2 z-[110]">
      <div className={`bg-slate-900 text-white px-5 py-3 rounded-full shadow-lg shadow-slate-900/20 flex items-center gap-2 font-medium text-sm border border-slate-700/50 ${animationClass}`}>
        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        {toastMessage}
      </div>
    </div>
  )
}
