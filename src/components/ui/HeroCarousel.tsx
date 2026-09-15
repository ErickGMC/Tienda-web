'use client';

import React, { useState, useEffect, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { Store, Tag, Utensils, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
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
      
      {/* Contenedor del Carrusel con Smart Fit y Fondo Glassmorphic */}
      <div 
        className="overflow-hidden rounded-3xl sm:rounded-[2rem] shadow-xl border border-slate-200/80 dark:border-slate-800 bg-slate-950 relative aspect-[16/9] sm:aspect-[21/9] md:aspect-[24/9] lg:aspect-[28/9] min-h-[220px] sm:min-h-[280px] md:min-h-[340px]" 
        ref={emblaRef}
      >
        <div className="flex h-full">
          {banners.map((slide, idx) => {
            const hasTextContent = Boolean(slide.title || slide.subtitle || slide.badgeText || slide.ctaText);

            return (
              <div className="relative flex-[0_0_100%] h-full min-w-0 flex items-center justify-center overflow-hidden bg-slate-950" key={slide.id || idx}>
                
                {/* ── CAPA 1: FONDO DESENFOCADO AMBIENTAL (Smart Blur Backdrop) ── */}
                <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none" aria-hidden="true">
                  <Image 
                    src={slide.imageUrl}
                    alt=""
                    fill
                    sizes="100vw"
                    className="object-cover object-center scale-125 blur-2xl brightness-50 opacity-90 saturate-150"
                  />
                  {/* Gradiente adicional para unificar luminosidad */}
                  <div className="absolute inset-0 bg-slate-950/40 dark:bg-slate-950/60" />
                </div>

                {/* ── CAPA 2: IMAGEN PRINCIPAL EN ALTA DEFINICIÓN SIN RECORTE (Smart Fit) ── */}
                <div className="relative w-full h-full flex items-center justify-center z-10">
                  <Image 
                    src={slide.imageUrl}
                    alt={slide.title || 'Banner de promociones'}
                    fill
                    sizes="(max-width: 768px) 100vw, 1280px"
                    className="object-contain sm:object-cover object-center drop-shadow-2xl transition-transform duration-700 ease-out group-hover:scale-[1.01]"
                    priority={idx === 0}
                  />
                </div>

                {/* ── CAPA 3: TEXTO Y CTA (Renderizado adaptable si existe) ── */}
                {hasTextContent && (
                  <div className="absolute inset-0 flex flex-col justify-end sm:justify-center p-3 sm:p-8 md:p-12 z-20 pointer-events-none">
                    <div className="max-w-xl flex flex-col items-start text-left space-y-1.5 sm:space-y-3 bg-slate-950/70 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none p-3 sm:p-0 rounded-2xl border border-white/10 sm:border-0 shadow-lg sm:shadow-none pointer-events-auto">
                      
                      {/* Badge de Categoría */}
                      {slide.badgeText && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-white/20 dark:bg-black/40 text-white backdrop-blur-md text-[10px] sm:text-xs font-black border border-white/30 shadow-md">
                          {getBadgeIcon(slide.ctaActionCategory)}
                          <span>{slide.badgeText}</span>
                        </div>
                      )}

                      {/* Título */}
                      {slide.title && (
                        <h1 className="text-base sm:text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight drop-shadow-md line-clamp-2">
                          {slide.title}
                        </h1>
                      )}

                      {/* Subtítulo */}
                      {slide.subtitle && (
                        <p className="text-[11px] sm:text-sm md:text-base text-slate-200 max-w-lg line-clamp-2 sm:line-clamp-3 leading-relaxed drop-shadow-sm">
                          {slide.subtitle}
                        </p>
                      )}

                      {/* Botón CTA */}
                      {slide.ctaText && (
                        <div className="pt-0.5 sm:pt-2">
                          <button 
                            onClick={() => handleCta(slide.ctaActionCategory)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-6 sm:py-3 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white font-black rounded-full shadow-lg shadow-emerald-500/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-xs sm:text-sm cursor-pointer border border-emerald-400/50"
                          >
                            <span>{slide.ctaText}</span>
                            <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      )}

                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>

        {/* Flechas de Navegación (Desktop) */}
        {banners.length > 1 && (
          <>
            <button 
              onClick={() => emblaApi?.scrollPrev()}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hidden sm:flex cursor-pointer shadow-lg"
              aria-label="Banner anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={() => emblaApi?.scrollNext()}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hidden sm:flex cursor-pointer shadow-lg"
              aria-label="Siguiente banner"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Indicadores de Paginación (Dots Dinámicos) */}
        {banners.length > 1 && (
          <div className="absolute bottom-2.5 right-3 sm:bottom-4 sm:right-6 z-30 flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/15 shadow-md">
            {scrollSnaps.map((_, snapIdx) => (
              <button
                key={snapIdx}
                onClick={() => emblaApi?.scrollTo(snapIdx)}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  selectedIndex === snapIdx
                    ? 'w-5 h-1.5 sm:w-6 sm:h-2 bg-emerald-400 shadow-md shadow-emerald-500/50'
                    : 'w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white/50 hover:bg-white/80'
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
