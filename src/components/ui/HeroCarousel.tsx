'use client'

import React, { useEffect } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import { Store, Tag, Utensils } from 'lucide-react'
import Image from 'next/image'
import { useTiendaStore } from '@/lib/store'

import { Banner } from '@/lib/actions'

const GRADIENTS = [
  'from-emerald-900/80 to-slate-900/80',
  'from-amber-900/80 to-slate-900/80',
  'from-rose-900/80 to-slate-900/80',
  'from-indigo-900/80 to-slate-900/80',
  'from-purple-900/80 to-slate-900/80'
];

export default function HeroCarousel({ banners }: { banners: Banner[] }) {
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

  const getBadgeIcon = (category?: string) => {
    switch (category) {
      case 'Servicios':
        return <Utensils className="w-4 h-4" />;
      case 'Abarrotes':
        return <Store className="w-4 h-4" />;
      default:
        return <Tag className="w-4 h-4" />;
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
          {banners.map((slide, idx) => (
            <div className="relative flex-[0_0_100%] h-full min-w-0" key={slide.id}>
              
              {/* Imagen de Fondo */}
              <div className="absolute inset-0 w-full h-full">
                <Image 
                  src={slide.imageUrl}
                  alt={slide.title}
                  fill
                  sizes="100vw"
                  className="object-cover"
                  priority={idx === 0}
                />
              </div>

              {/* Overlay con Gradiente */}
              <div className={`absolute inset-0 bg-gradient-to-r ${GRADIENTS[idx % GRADIENTS.length]} mix-blend-multiply`} />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent" />

              {/* Contenido del Slide */}
              <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8 md:p-16 z-10">
                <div className="max-w-2xl transform transition-transform duration-700 translate-y-0 opacity-100">
                  
                  {/* Badge */}
                  {slide.badgeText && (
                    <div className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-full bg-white/20 text-white backdrop-blur-md text-[10px] sm:text-sm font-semibold mb-2 sm:mb-4 border border-white/30">
                      {getBadgeIcon(slide.ctaActionCategory)}
                      {slide.badgeText}
                    </div>
                  )}

                  {/* Título y Subtítulo */}
                  <h1 className="text-2xl sm:text-4xl md:text-6xl font-extrabold text-white mb-2 sm:mb-4 leading-tight drop-shadow-lg">
                    {slide.title}
                  </h1>
                  {slide.subtitle && (
                    <p className="text-sm sm:text-lg md:text-xl text-slate-200 mb-4 sm:mb-8 max-w-xl drop-shadow-md line-clamp-2">
                      {slide.subtitle}
                    </p>
                  )}

                  {/* Botón CTA */}
                  <button 
                    onClick={() => handleCta(slide.ctaActionCategory)}
                    className="px-6 py-2 sm:px-8 sm:py-3.5 bg-white text-slate-900 hover:bg-emerald-500 hover:text-white rounded-full font-bold transition-all duration-300 shadow-xl shadow-black/20 transform hover:-translate-y-1 text-xs sm:text-base"
                  >
                    {slide.ctaText || 'Ver más'}
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      </div>

      {/* Controles del Carrusel */}
      {banners.length > 1 && (
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
      )}

    </div>
  )
}
