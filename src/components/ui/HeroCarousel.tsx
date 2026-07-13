'use client'

import React, { useState, useEffect, useCallback } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import { Store, Tag, Utensils, ChevronLeft, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import { useTiendaStore } from '@/lib/store'
import { Banner } from '@/lib/actions'

export default function HeroCarousel({ banners }: { banners: Banner[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
    Autoplay({ delay: 5000, stopOnInteraction: true })
  ])
  
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([])
  
  const onInit = useCallback(() => {
    if (!emblaApi) return
    setScrollSnaps(emblaApi.scrollSnapList())
  }, [emblaApi])

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onInit()
    onSelect()
    emblaApi.on('reInit', onInit)
    emblaApi.on('reInit', onSelect)
    emblaApi.on('select', onSelect)
  }, [emblaApi, onInit, onSelect])
  
  const { setSelectedCategory } = useTiendaStore()

  const handleCta = (category?: string) => {
    if (category) {
      setSelectedCategory(category as any)
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

  const activeSlide = banners[selectedIndex] || banners[0];

  return (
    <div className="relative w-full rounded-3xl mb-6 sm:mb-10 group">
      
      {/* Contenedor del Carrusel */}
      <div className="overflow-hidden rounded-3xl shadow-xl aspect-[16/9] sm:aspect-[4/1] relative" ref={emblaRef}>
        <div className="flex h-full">
          {banners.map((slide, idx) => (
            <div className="relative flex-[0_0_100%] h-full min-w-0" key={slide.id}>
              
              {/* Imagen de Fondo */}
              <div className="absolute inset-0 w-full h-full">
                <Image 
                  src={slide.imageUrl}
                  alt={slide.title || 'Banner'}
                  fill
                  unoptimized={true}
                  sizes="100vw"
                  className="object-cover"
                  priority={idx === 0}
                />
                {/* Gradiente sutil para legibilidad de texto */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
              </div>

              {/* Contenido del Slide (sin el botón CTA aquí) */}
              {(slide.title || slide.subtitle || slide.badgeText) && (
                <div className="absolute inset-0 flex flex-col justify-center items-center text-center p-4 z-10 pointer-events-none">
                  <div className="max-w-2xl transform transition-transform duration-700 translate-y-0 opacity-100 pointer-events-auto flex flex-col items-center">
                    
                    {/* Badge */}
                    {slide.badgeText && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 sm:py-1.5 rounded-full bg-amber-500/90 text-white backdrop-blur-md text-xs font-bold mb-2 sm:mb-3 shadow-lg">
                        {getBadgeIcon(slide.ctaActionCategory)}
                        {slide.badgeText}
                      </div>
                    )}

                    {/* Título y Subtítulo */}
                    {slide.title && (
                      <h1 className="text-xl sm:text-4xl md:text-5xl font-extrabold text-white mb-1.5 sm:mb-4 leading-tight drop-shadow-md">
                        {slide.title}
                      </h1>
                    )}
                    {slide.subtitle && (
                      <p className="text-xs sm:text-base md:text-lg text-slate-100 max-w-lg drop-shadow-md line-clamp-2 sm:line-clamp-3 leading-snug">
                        {slide.subtitle}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Control Interactivo: Botón de Acción y Flechas solapados en el centro inferior */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 z-20 flex items-center justify-center gap-2 sm:gap-4 w-full px-4 pointer-events-none">
        
        {/* Flecha Anterior */}
        {banners.length > 1 && (
          <button 
            onClick={() => emblaApi?.scrollPrev()}
            className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-white dark:bg-slate-800 text-slate-800 dark:text-white flex items-center justify-center shadow-lg border-2 sm:border-4 border-slate-50 dark:border-slate-900 transition-transform hover:scale-110 active:scale-95 pointer-events-auto flex-shrink-0"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-4 h-4 sm:w-6 sm:h-6" />
          </button>
        )}

        {/* Botón Principal (Si el slide activo tiene CTA) */}
        {activeSlide && activeSlide.ctaText && (
          <button 
            onClick={() => handleCta(activeSlide.ctaActionCategory)}
            className="px-6 py-2.5 sm:px-10 sm:py-4 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-full shadow-[0_4px_15px_rgba(245,158,11,0.4)] sm:shadow-[0_8px_30px_rgba(245,158,11,0.4)] transition-all transform hover:-translate-y-1 active:translate-y-0 text-xs sm:text-base pointer-events-auto max-w-[200px] sm:max-w-none truncate border-2 sm:border-4 border-slate-50 dark:border-slate-900"
          >
            {activeSlide.ctaText}
          </button>
        )}

        {/* Flecha Siguiente */}
        {banners.length > 1 && (
          <button 
            onClick={() => emblaApi?.scrollNext()}
            className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-white dark:bg-slate-800 text-slate-800 dark:text-white flex items-center justify-center shadow-lg border-2 sm:border-4 border-slate-50 dark:border-slate-900 transition-transform hover:scale-110 active:scale-95 pointer-events-auto flex-shrink-0"
            aria-label="Siguiente"
          >
            <ChevronRight className="w-4 h-4 sm:w-6 sm:h-6" />
          </button>
        )}
      </div>

      {/* Dots de navegación (solo visuales por ahora) */}
      {scrollSnaps.length > 1 && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
          {scrollSnaps.map((_, index) => (
            <button
              key={index}
              onClick={() => emblaApi?.scrollTo(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === selectedIndex ? 'bg-amber-500 w-6' : 'bg-white/50 hover:bg-white/80'
              }`}
              aria-label={`Ir a slide ${index + 1}`}
            />
          ))}
        </div>
      )}

    </div>
  )
}
