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
    <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl mb-8 sm:mb-12 group aspect-[4/1] min-h-[150px]">
      
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

              {/* Mostrar contenido solo si hay algún texto */}
              {(slide.title || slide.subtitle || slide.badgeText || slide.ctaText) && (
                <>
                  {/* Contenido del Slide */}
                  <div className="absolute inset-0 flex flex-col justify-end sm:justify-center p-4 pb-2 sm:pb-8 sm:p-8 md:px-12 z-10 pointer-events-none">
                    <div className="max-w-xl transform transition-transform duration-700 translate-y-0 opacity-100 pointer-events-auto">
                      
                      {/* Badge */}
                      {slide.badgeText && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 text-white backdrop-blur-md text-[10px] sm:text-xs font-bold mb-1 sm:mb-2 border border-white/20 shadow-lg">
                          {getBadgeIcon(slide.ctaActionCategory)}
                          {slide.badgeText}
                        </div>
                      )}

                      {/* Título y Subtítulo (con sombra fuerte para resaltar sin oscurecer fondo) */}
                      {slide.title && (
                        <h1 className="text-lg sm:text-3xl md:text-4xl font-extrabold text-white mb-1 sm:mb-2 leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                          {slide.title}
                        </h1>
                      )}
                      {slide.subtitle && (
                        <p className="text-[10px] sm:text-sm md:text-base text-slate-100 mb-2 sm:mb-4 max-w-md drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] line-clamp-2">
                          {slide.subtitle}
                        </p>
                      )}

                      {/* Botón CTA */}
                      {slide.ctaText && (
                        <div className="mt-1 sm:mt-0 inline-block">
                          <button 
                            onClick={() => handleCta(slide.ctaActionCategory)}
                            className="px-4 py-1.5 sm:px-6 sm:py-2.5 bg-emerald-500 text-white hover:bg-emerald-400 rounded-full font-bold transition-all duration-300 shadow-lg shadow-emerald-500/50 transform hover:-translate-y-0.5 text-[10px] sm:text-sm border border-emerald-400"
                          >
                            {slide.ctaText}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}


            </div>
          ))}
        </div>
      </div>

      {/* Controles del Carrusel */}
      {banners.length > 1 && (
        <div className="absolute bottom-2 right-2 sm:bottom-6 sm:right-6 z-20 flex gap-1 sm:gap-2">
          <button 
            onClick={() => emblaApi?.scrollPrev()}
            className="w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center text-white transition-colors border border-white/20 shadow-lg"
            aria-label="Anterior"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button 
            onClick={() => emblaApi?.scrollNext()}
            className="w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center text-white transition-colors border border-white/20 shadow-lg"
            aria-label="Siguiente"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      )}

    </div>
  )
}
