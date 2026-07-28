import { Producto } from '@/types/producto'
import { MessageCircle, Plus, Check, Star } from 'lucide-react'
import Image from 'next/image'
import { useTiendaStore } from '@/lib/store'

interface ProductCardProps {
  producto: Producto;
}

export default function ProductCard({ producto }: ProductCardProps) {
  const { consultaList, addToConsulta, showPrices, empresa, config, showToast } = useTiendaStore();
  const estaEnLista = consultaList.some(p => p.id === producto.id);

  // Generar un color aleatorio para el placeholder si no hay imagen
  const placeholderGradients = [
    'from-amber-400 to-orange-500',
    'from-rose-400 to-red-500',
    'from-yellow-400 to-amber-500',
    'from-orange-400 to-rose-500',
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

    const numero = config?.whatsapp || empresa?.telefono || "51970560023";
    const mensaje = `Hola, quisiera consultar por el producto: *${producto.nombre}*`;
    window.open(`https://wa.me/${numero}?text=${mensaje}`, '_blank');
  };

  const handleAddToList = () => {
    addToConsulta(producto);
    showToast(`"${producto.nombre}" agregado a tu lista`);
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
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-slate-100 dark:bg-slate-800/80 flex flex-col items-center justify-center p-4 text-center border-b border-slate-200 dark:border-slate-800">
            <span className="text-amber-500 font-bold text-3xl uppercase tracking-wider mb-1">
              {producto.nombre.substring(0, 2)}
            </span>
            <span className="text-[10px] text-slate-400 font-medium line-clamp-1 max-w-[80%]">
              {producto.categoria}
            </span>
          </div>
        )}
        
        {/* Badges Overlay Container - Flexbox prevent overlap */}
        <div className="absolute top-2 left-2 right-2 sm:top-3 sm:left-3 sm:right-3 flex items-center justify-between gap-1 pointer-events-none z-10">
          {/* Category Badge */}
          <div className="px-2 py-0.5 sm:px-3 sm:py-1 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-full text-[10px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm truncate max-w-[60%] sm:max-w-[65%] pointer-events-auto">
            {producto.categoria}
          </div>

          {/* Destacado Badge */}
          {producto.destacado && (
            <div className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-amber-500 rounded-full text-[10px] sm:text-xs font-bold text-white shadow-sm flex items-center gap-1 shrink-0 pointer-events-auto">
              <Star className="w-3 h-3 fill-white shrink-0" />
              <span className="text-[10px] sm:text-xs">Destacado</span>
            </div>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-3 sm:p-5 flex flex-col flex-1">
        <h3 className="font-semibold text-sm sm:text-lg text-slate-900 dark:text-white line-clamp-2 mb-1 group-hover:text-amber-500 transition-colors">
          {producto.nombre}
        </h3>
        
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-3 sm:mb-4 line-clamp-1 sm:line-clamp-2">
          {producto.descripcion}
        </p>

        <div className="mt-auto">
          {showPrices && (
            <div className="mb-3 sm:mb-4 flex items-baseline justify-between">
              <div>
                <span className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">
                  S/ {producto.precio.toFixed(2)}
                </span>
                <span className="text-[10px] sm:text-xs text-slate-500 ml-1">
                  / {producto.unidadMedida}
                </span>
              </div>
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                En stock
              </span>
            </div>
          )}
          
          <div className="flex gap-1.5 sm:gap-2 mt-2 sm:mt-4">
            <button 
              onClick={handleConsultarWhatsapp}
              title="Consultar por WhatsApp"
              className="flex-1 flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2.5 rounded-xl bg-[#25D366] hover:bg-[#1ebe5d] text-white font-semibold transition-all duration-200 text-xs sm:text-sm shadow-sm active:scale-95"
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span>Consultar</span>
            </button>
            <button 
              onClick={handleAddToList}
              disabled={estaEnLista}
              title={estaEnLista ? "Ya en la lista" : "Agregar a la lista"}
              className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl transition-all duration-300 shrink-0 active:scale-95 ${
                estaEnLista 
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 cursor-not-allowed border border-emerald-200 dark:border-emerald-800' 
                  : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white dark:hover:bg-amber-500 dark:hover:text-white border border-amber-200/50 dark:border-amber-500/20'
              }`}
            >
              {estaEnLista ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : <Plus className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
