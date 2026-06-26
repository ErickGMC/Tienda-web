'use client'

import React, { useEffect } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import { Store, Tag, Utensils } from 'lucide-react'
import Image from 'next/image'
import { useTiendaStore } from '@/lib/store'

// Tipos temporales (luego vendrán de Firebase)
type SlideData = {
  id: string
  title: string
  subtitle: string
  image: string
  badgeText: string
  badgeIcon: React.ReactNode
  ctaText: string
  ctaActionCategory?: string
  gradient: string
}

const SLIDES: SlideData[] = [
  {
    id: '1',
    title: 'Frescura y Calidad a tu alcance',
    subtitle: 'Todo lo que tu hogar necesita, al mejor precio y más cerca de ti.',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=2574&auto=format&fit=crop', // Verduras frescas
    badgeText: 'Bienvenido',
    badgeIcon: <Store className="w-4 h-4" />,
    ctaText: 'Ver Catálogo',
    gradient: 'from-emerald-900/80 to-slate-900/80',
  },
  {
    id: '2',
    title: '¡Ofertas de Fin de Semana!',
    subtitle: 'Aprovecha los descuentos en abarrotes y artículos de limpieza.',
    image: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?q=80&w=2574&auto=format&fit=crop', // Supermercado
    badgeText: 'Promoción',
    badgeIcon: <Tag className="w-4 h-4" />,
    ctaText: 'Ver Ofertas',
    gradient: 'from-amber-900/80 to-slate-900/80',
  },
  {
    id: '3',
    title: 'Menú del Día',
    subtitle: 'Comida casera, caliente y deliciosa lista para disfrutar.',
    image: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?q=80&w=2670&auto=format&fit=crop', // Comida
    badgeText: 'Servicios',
    badgeIcon: <Utensils className="w-4 h-4" />,
    ctaText: 'Ver Menú',
    ctaActionCategory: 'Servicios',
    gradient: 'from-rose-900/80 to-slate-900/80',
  }
]

export default function HeroCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
    Autoplay({ delay: 5000, stopOnInteraction: true })
  ])
  
  const { setSelectedCategory } = useTiendaStore()

  const handleCta = (category?: string) => {
    if (category) {
      setSelectedCategory(category as any)
      // Smooth scroll a productos (opcional)
      window.scrollTo({ top: 500, behavior: 'smooth' })
    }
  }

  return (
    <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl mb-8 sm:mb-12 group h-[250px] sm:h-[400px] md:h-[500px]">
      
      {/* Marca Fija - Para no perder el nombre de la tienda */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20 flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-white/20 shadow-lg">
        <Store className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
        <span className="font-bold text-white tracking-wide text-xs sm:text-base">MINIMARKET FLOR</span>
      </div>

      <div className="overflow-hidden h-full" ref={emblaRef}>
        <div className="flex h-full">
          {SLIDES.map((slide) => (
            <div className="relative flex-[0_0_100%] h-full min-w-0" key={slide.id}>
              
              {/* Imagen de Fondo */}
              <div className="absolute inset-0 w-full h-full">
                <Image 
                  src={slide.image}
                  alt={slide.title}
                  fill
                  sizes="100vw"
                  className="object-cover"
                  priority={slide.id === '1'}
                />
              </div>

              {/* Overlay con Gradiente (Mejora la legibilidad) */}
              <div className={`absolute inset-0 bg-gradient-to-r ${slide.gradient} mix-blend-multiply`} />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent" />

              {/* Contenido del Slide */}
              <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8 md:p-16 z-10">
                <div className="max-w-2xl transform transition-transform duration-700 translate-y-0 opacity-100">
                  
                  {/* Badge */}
                  <div className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-full bg-white/20 text-white backdrop-blur-md text-[10px] sm:text-sm font-semibold mb-2 sm:mb-4 border border-white/30">
                    {slide.badgeIcon}
                    {slide.badgeText}
                  </div>

                  {/* Título y Subtítulo */}
                  <h1 className="text-2xl sm:text-4xl md:text-6xl font-extrabold text-white mb-2 sm:mb-4 leading-tight drop-shadow-lg">
                    {slide.title}
                  </h1>
                  <p className="text-sm sm:text-lg md:text-xl text-slate-200 mb-4 sm:mb-8 max-w-xl drop-shadow-md line-clamp-2">
                    {slide.subtitle}
                  </p>

                  {/* Botón CTA */}
                  <button 
                    onClick={() => handleCta(slide.ctaActionCategory)}
                    className="px-6 py-2 sm:px-8 sm:py-3.5 bg-white text-slate-900 hover:bg-emerald-500 hover:text-white rounded-full font-bold transition-all duration-300 shadow-xl shadow-black/20 transform hover:-translate-y-1 text-xs sm:text-base"
                  >
                    {slide.ctaText}
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      </div>

      {/* Controles del Carrusel */}
      <div className="absolute bottom-6 right-6 z-20 flex gap-2">
        <button 
          onClick={() => emblaApi?.scrollPrev()}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/30 backdrop-blur-md flex items-center justify-center text-white transition-colors border border-white/20"
          aria-label="Anterior"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <button 
          onClick={() => emblaApi?.scrollNext()}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/30 backdrop-blur-md flex items-center justify-center text-white transition-colors border border-white/20"
          aria-label="Siguiente"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

    </div>
  )
}
