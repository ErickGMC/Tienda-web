'use client';

import React, { useState, useEffect, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { Store, Tag, Utensils, ChevronLeft, ChevronRight, Sparkles, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { useTiendaStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Banner } from '@/lib/actions';

export default function HeroCarousel({ banners }: { banners: Banner[] }) {
  const router = useRouter();
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, duration: 25 }, [
    Autoplay({ delay: 5000, stopOnInteraction: true })
  ]);
  
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
  
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
  }, [emblaApi, onSelect]);
  
  const { setSelectedCategory } = useTiendaStore();

  const handleCta = (category?: string) => {
    if (category) {
      if (category === 'Comunidad') {
        router.push('/nosotros');
        return;
      }
      setSelectedCategory(category as any);
      setTimeout(() => {
        const productsGrid = document.getElementById('productos-grid');
        if (productsGrid) {
          const y = productsGrid.getBoundingClientRect().top + window.scrollY - 100;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 50);
    }
  };

  const getBadgeIcon = (category?: string) => {
    switch (category) {
      case 'Servicios':
        return <Utensils className="w-3.5 h-3.5" />;
      case 'Abarrotes':
        return <Store className="w-3.5 h-3.5" />;
      default:
        return <Tag className="w-3.5 h-3.5" />;
    }
  };

  if (!banners || banners.length === 0) return null;

  return (
    <div className="relative w-full mb-6 sm:mb-10 group">
      
      {/* Contenedor del Carrusel con Aspect Ratio Adaptativo (Mobile vs Desktop) */}
      <div 
        className="overflow-hidden rounded-3xl sm:rounded-[2rem] shadow-xl border border-slate-200/60 dark:border-slate-800 relative aspect-[16/9] sm:aspect-[21/9] md:aspect-[24/9] lg:aspect-[28/9] min-h-[220px] sm:min-h-[280px] md:min-h-[340px]" 
        ref={emblaRef}
      >
        <div className="flex h-full">
          {banners.map((slide, idx) => (
            <div className="relative flex-[0_0_100%] h-full min-w-0" key={slide.id || idx}>
              
              {/* Imagen de Fondo */}
              <div className="absolute inset-0 w-full h-full">
                <Image 
                  src={slide.imageUrl}
                  alt={slide.title || 'Banner Minimarket'}
                  fill
                  unoptimized={true}
                  sizes="(max-width: 768px) 100vw, 1280px"
                  className="object-cover object-center transform scale-100 group-hover:scale-105 transition-transform duration-700 ease-out"
                  priority={idx === 0}
                />
                {/* Gradiente multicapa para contraste profesional del texto */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-black/20 sm:bg-gradient-to-r sm:from-slate-950/85 sm:via-slate-950/50 sm:to-transparent" />
              </div>

              {/* Contenido del Slide */}
              <div className="absolute inset-0 flex flex-col justify-end sm:justify-center p-4 sm:p-8 md:p-12 z-10">
                <div className="max-w-xl flex flex-col items-start text-left space-y-2 sm:space-y-3">
                  
                  {/* Badge de Categoría / Promoción */}
                  {slide.badgeText && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 dark:bg-black/40 text-white backdrop-blur-md text-[11px] sm:text-xs font-black border border-white/30 shadow-md">
                      {getBadgeIcon(slide.ctaActionCategory)}
                      <span>{slide.badgeText}</span>
                    </div>
                  )}

                  {/* Título Principal */}
                  {slide.title && (
                    <h1 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight drop-shadow-md line-clamp-2">
                      {slide.title}
                    </h1>
                  )}

                  {/* Subtítulo Descriptivo */}
                  {slide.subtitle && (
                    <p className="text-xs sm:text-sm md:text-base text-slate-200 max-w-lg line-clamp-2 sm:line-clamp-3 leading-relaxed drop-shadow-sm">
                      {slide.subtitle}
                    </p>
                  )}

                  {/* Botón CTA Dinámico dentro del Banner */}
                  {slide.ctaText && (
                    <div className="pt-1 sm:pt-2">
                      <button 
                        onClick={() => handleCta(slide.ctaActionCategory)}
                        className="inline-flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white font-black rounded-full shadow-lg shadow-emerald-500/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-xs sm:text-sm cursor-pointer border border-emerald-400/50"
                      >
                        <span>{slide.ctaText}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                </div>
              </div>

            </div>
          ))}
        </div>

        {/* Flechas de Navegación (Desktop) */}
        {banners.length > 1 && (
          <>
            <button 
              onClick={() => emblaApi?.scrollPrev()}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hidden sm:flex cursor-pointer"
              aria-label="Banner anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={() => emblaApi?.scrollNext()}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hidden sm:flex cursor-pointer"
              aria-label="Siguiente banner"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Indicadores de Paginación (Dots Dinámicos) */}
        {banners.length > 1 && (
          <div className="absolute bottom-3 right-4 sm:bottom-4 sm:right-6 z-20 flex items-center gap-1.5">
            {scrollSnaps.map((_, snapIdx) => (
              <button
                key={snapIdx}
                onClick={() => emblaApi?.scrollTo(snapIdx)}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  selectedIndex === snapIdx
                    ? 'w-6 h-2 bg-emerald-400 shadow-md shadow-emerald-500/50'
                    : 'w-2 h-2 bg-white/50 hover:bg-white/80'
                }`}
                aria-label={`Ir al banner ${snapIdx + 1}`}
              />
            ))}
          </div>
        )}

      </div>

    </div>
  );
}
