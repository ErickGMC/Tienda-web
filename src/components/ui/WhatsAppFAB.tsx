'use client'

import { useTiendaStore } from '@/lib/store'
import { MessageCircle } from 'lucide-react'

export default function WhatsAppFAB() {
  const { config, empresa } = useTiendaStore()
  
  const telefonoStr = config?.whatsapp || empresa?.telefono || '51970560023';
  const mensaje = "Hola, estoy visitando su catálogo virtual y quisiera hacer una consulta.";

  const handleClick = () => {
    window.open(`https://wa.me/${telefonoStr}?text=${encodeURIComponent(mensaje)}`, '_blank');
  };

  return (
    <button 
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-[90] w-14 h-14 bg-[#25D366] hover:bg-[#1ebe5d] text-white rounded-full flex items-center justify-center shadow-lg shadow-[#25D366]/40 transition-transform hover:scale-110 active:scale-95 group animate-fab-pulse"
      aria-label="Contactar por WhatsApp"
    >
      <MessageCircle className="w-7 h-7" />
      {/* Tooltip on hover */}
      <span className="absolute right-full mr-4 bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-sm hidden sm:block">
        ¿Necesitas ayuda?
        {/* Triangle pointer */}
        <span className="absolute top-1/2 -right-1 transform -translate-y-1/2 border-t-4 border-t-transparent border-l-4 border-l-slate-900 border-b-4 border-b-transparent"></span>
      </span>
    </button>
  )
}
