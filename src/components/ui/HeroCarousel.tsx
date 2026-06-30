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

              {/* Mostrar overlay y contenido solo si hay algún texto */}
              {(slide.title || slide.subtitle || slide.badgeText || slide.ctaText) && (
                <>
                  {/* Overlay Ligero para que el texto sea legible sin oscurecer toda la imagen */}
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-900/30 to-transparent" />

                  {/* Contenido del Slide */}
                  <div className="absolute inset-0 flex flex-col justify-center p-4 sm:p-8 md:px-12 z-10">
                    <div className="max-w-xl transform transition-transform duration-700 translate-y-0 opacity-100">
                      
                      {/* Badge */}
                      {slide.badgeText && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 text-white backdrop-blur-md text-[10px] sm:text-xs font-bold mb-2 border border-white/30 shadow-sm">
                          {getBadgeIcon(slide.ctaActionCategory)}
                          {slide.badgeText}
                        </div>
                      )}

                      {/* Título y Subtítulo */}
                      {slide.title && (
                        <h1 className="text-xl sm:text-3xl md:text-4xl font-extrabold text-white mb-2 leading-tight drop-shadow-md">
                          {slide.title}
                        </h1>
                      )}
                      {slide.subtitle && (
                        <p className="text-xs sm:text-sm md:text-base text-slate-100 mb-4 max-w-md drop-shadow line-clamp-2">
                          {slide.subtitle}
                        </p>
                      )}

                      {/* Botón CTA */}
                      {slide.ctaText && (
                        <button 
                          onClick={() => handleCta(slide.ctaActionCategory)}
                          className="px-5 py-2 sm:px-6 sm:py-2.5 bg-emerald-500 text-white hover:bg-emerald-400 rounded-full font-bold transition-all duration-300 shadow-lg shadow-emerald-500/30 transform hover:-translate-y-0.5 text-xs sm:text-sm"
                        >
                          {slide.ctaText}
                        </button>
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
