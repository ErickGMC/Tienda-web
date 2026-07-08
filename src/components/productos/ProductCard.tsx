import { Producto } from '@/types/producto'
import { MessageCircle, Plus, Check } from 'lucide-react'
import Image from 'next/image'
import { useTiendaStore } from '@/lib/store'

interface ProductCardProps {
  producto: Producto;
}

export default function ProductCard({ producto }: ProductCardProps) {
  const { consultaList, addToConsulta, showPrices, empresa } = useTiendaStore();
  const estaEnLista = consultaList.some(p => p.id === producto.id);

  // Generar un color aleatorio para el placeholder si no hay imagen
  const placeholderGradients = [
    'from-emerald-400 to-teal-500',
    'from-blue-400 to-indigo-500',
    'from-orange-400 to-rose-500',
    'from-purple-400 to-fuchsia-500',
  ]
  const gradient = placeholderGradients[producto.nombre.length % placeholderGradients.length]

  const handleConsultarWhatsapp = async () => {
    // Log analytics
    try {
      const { logAnalyticsEvent } = await import('@/lib/actions');
      await logAnalyticsEvent('whatsapp_click', {
        source: 'product_card',
        productId: producto.id,
        productName: producto.nombre
      });
    } catch (e) {
      console.warn('Analytics error', e);
    }

    const numero = empresa?.telefono || "51970560023";
    const mensaje = `Hola, quisiera consultar por el producto: *${producto.nombre}*`;
    window.open(`https://wa.me/${numero}?text=${mensaje}`, '_blank');
  };

  return (
    <div className="group relative flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out">
      
      {/* Image / Placeholder Area */}
      <div className="relative aspect-square w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
        {producto.imagenUrl ? (
          <Image 
            src={producto.imagenUrl || ''} 
            alt={producto.nombre}
            fill
            unoptimized={true}
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient} opacity-80 flex items-center justify-center`}>
            <span className="text-white/80 font-bold text-4xl uppercase">
              {producto.nombre.substring(0, 2)}
            </span>
          </div>
        )}
        
        {/* Category Badge */}
        <div className="absolute top-2 left-2 px-2 py-0.5 sm:top-3 sm:left-3 sm:px-3 sm:py-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-full text-[10px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm">
          {producto.categoria}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-3 sm:p-5 flex flex-col flex-1">
        <h3 className="font-semibold text-sm sm:text-lg text-slate-900 dark:text-white line-clamp-2 mb-1 group-hover:text-emerald-500 transition-colors">
          {producto.nombre}
        </h3>
        
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-3 sm:mb-4 line-clamp-1 sm:line-clamp-2">
          {producto.descripcion}
        </p>

        <div className="mt-auto">
          {showPrices && (
            <div className="mb-3 sm:mb-4">
              <span className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">
                S/ {producto.precio.toFixed(2)}
              </span>
              <span className="text-[10px] sm:text-xs text-slate-500 ml-1">
                / {producto.unidadMedida}
              </span>
            </div>
          )}
          
          <div className="flex gap-1.5 sm:gap-2 mt-2 sm:mt-4">
            <button 
              onClick={handleConsultarWhatsapp}
              title="Consultar por WhatsApp"
              className="flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-green-500 hover:bg-green-600 text-white font-medium transition-colors text-xs sm:text-sm"
            >
              <MessageCircle className="w-4 h-4 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Consultar</span>
            </button>
            <button 
              onClick={() => addToConsulta(producto)}
              disabled={estaEnLista}
              title={estaEnLista ? "Ya en la lista" : "Agregar a la lista"}
              className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl transition-all duration-300 shrink-0 ${
                estaEnLista 
                  ? 'bg-slate-100 dark:bg-slate-800 text-emerald-500 cursor-not-allowed' 
                  : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-500 dark:hover:text-white'
              }`}
            >
              {estaEnLista ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
