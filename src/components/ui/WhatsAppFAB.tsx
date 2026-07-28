'use client'

import { useTiendaStore } from '@/lib/store'
import { MessageCircle, ShoppingBag } from 'lucide-react'

export default function WhatsAppFAB() {
  const { config, empresa, consultaList, showPrices } = useTiendaStore()
  
  const telefonoStr = config?.whatsapp || empresa?.telefono || '51970560023';
  const itemCount = consultaList.length;

  const handleClick = () => {
    let mensaje = "Hola, estoy visitando su catálogo virtual y quisiera hacer una consulta.";

    if (itemCount > 0) {
      const itemsFormatted = consultaList.map(p => {
        const precioTxt = showPrices && p.precio > 0 ? ` (S/ ${p.precio.toFixed(2)})` : '';
        return `• ${p.nombre}${precioTxt}`;
      }).join('\n');

      mensaje = `Hola ${config?.nombreTienda || 'Minimarket Flor'}! Quisiera consultar la disponibilidad de esta lista de productos (${itemCount} items):\n\n${itemsFormatted}\n\n¿Me pueden confirmar stock y total? Muchas gracias!`;
    }

    window.open(`https://wa.me/${telefonoStr}?text=${encodeURIComponent(mensaje)}`, '_blank');
  };

  return (
    <div className="fixed bottom-6 right-6 z-[90] flex items-center">
      <button 
        onClick={handleClick}
        className="relative w-14 h-14 bg-[#25D366] hover:bg-[#1ebe5d] text-white rounded-full flex items-center justify-center shadow-lg shadow-[#25D366]/40 transition-all duration-300 hover:scale-110 active:scale-95 group animate-fab-pulse"
        aria-label="Cotizar por WhatsApp"
      >
        {itemCount > 0 ? (
          <ShoppingBag className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-7 h-7" />
        )}

        {/* Badge dinámico con el número de productos en la lista */}
        {itemCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-amber-500 text-white font-extrabold text-xs w-6 h-6 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-md animate-bounce">
            {itemCount}
          </span>
        )}

        {/* Tooltip en hover */}
        <span className="absolute right-full mr-4 bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md hidden sm:block">
          {itemCount > 0 ? `Cotizar ${itemCount} producto(s) por WhatsApp` : '¿Necesitas ayuda? Escríbenos'}
          {/* Triángulo indicador */}
          <span className="absolute top-1/2 -right-1 transform -translate-y-1/2 border-t-4 border-t-transparent border-l-4 border-l-slate-900 border-b-4 border-b-transparent"></span>
        </span>
      </button>
    </div>
  )
}
