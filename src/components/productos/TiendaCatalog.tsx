'use client';

import React, { useMemo, useEffect, useRef, useState } from 'react';
import { Producto, CategoriaProducto } from '@/types/producto';
import { Banner, WebConfig, EmpresaConfig } from '@/lib/actions';
import ProductCard from './ProductCard';
import FamilyDetailModal from './FamilyDetailModal';
import HeroCarousel from '@/components/ui/HeroCarousel';
import { useTiendaStore } from '@/lib/store';
import { ChevronLeft, ChevronRight, Sparkles, Clock, X, Package } from 'lucide-react';

interface TiendaCatalogProps {
  productos: Producto[];
  banners: Banner[];
  config: WebConfig;
  empresa: EmpresaConfig;
}

const CATEGORIAS: (CategoriaProducto | 'Todas')[] = [
  'Todas', 'Abarrotes', 'Bebidas', 'Golosinas', 'Verduras', 'Frutas', 'Aseo y limpieza', 'Ferreteria y electricidad', 'Bazar', 'Medicina', 'Libreria', 'Ocasión y Otros'
];

export default function TiendaCatalog({ productos, banners, config, empresa }: TiendaCatalogProps) {
  const { 
    searchQuery, 
    activeSearchTerm,
    ragProductos, 
    searchNivel,
    searchLatencyMs,
    clearSearch,
    selectedCategory, 
    setSelectedCategory, 
    setShowPrices, 
    setConfig 
  } = useTiendaStore();

  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Paginación (12 familias por página)
  const ITEMS_PER_PAGE = 12;
  const [currentPage, setCurrentPage] = useState(1);

  // Estado para el Modal de Presentaciones de Familia
  const [selectedFamilyForModal, setSelectedFamilyForModal] = useState<Producto | null>(null);
  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);

  const handleOpenFamily = (prod: Producto) => {
    setSelectedFamilyForModal(prod);
    setIsFamilyModalOpen(true);
  };

  const handleCloseFamilyModal = () => {
    setIsFamilyModalOpen(false);
    setSelectedFamilyForModal(null);
  };

  const isSearchActive = Boolean(activeSearchTerm.trim() || searchQuery.trim() || ragProductos);

  // Resetear a la página 1 cuando cambia el filtro o la búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchQuery, activeSearchTerm, ragProductos]);

  // Drag to scroll logic
  const dragState = useRef({ isDragging: false, startX: 0, scrollLeft: 0, hasDragged: false });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    dragState.current.isDragging = true;
    dragState.current.hasDragged = false;
    dragState.current.startX = e.pageX - scrollRef.current.offsetLeft;
    dragState.current.scrollLeft = scrollRef.current.scrollLeft;
  };

  const handleMouseLeave = () => {
    dragState.current.isDragging = false;
    if (scrollRef.current) scrollRef.current.classList.remove('dragging-active');
  };

  const handleMouseUp = () => {
    dragState.current.isDragging = false;
    if (scrollRef.current) {
      setTimeout(() => {
        if (scrollRef.current) scrollRef.current.classList.remove('dragging-active');
      }, 0);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragState.current.isDragging || !scrollRef.current) return;
    const x = e.pageX - scrollRef.current.offsetLeft;
    if (!dragState.current.hasDragged && Math.abs(x - dragState.current.startX) > 5) {
      dragState.current.hasDragged = true;
      scrollRef.current.classList.add('dragging-active');
    }
    if (dragState.current.hasDragged) {
      e.preventDefault();
      const walk = (x - dragState.current.startX) * 1.5;
      scrollRef.current.scrollLeft = dragState.current.scrollLeft - walk;
    }
  };

  const scrollByAmount = (amount: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  const handleCategoryClick = (cat: CategoriaProducto | 'Todas') => {
    setSelectedCategory(cat);
    setTimeout(() => {
      const productsGrid = document.getElementById('productos-grid');
      if (productsGrid) {
        const y = productsGrid.getBoundingClientRect().top + window.scrollY - 100;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }, 50);
  };

  // Guardar configuración inicial al cargar la página
  useEffect(() => {
    if (config && config.mostrarPrecios !== undefined) {
      setShowPrices(config.mostrarPrecios);
    }
    setConfig(config || {}, empresa || {});
  }, [config, empresa, setShowPrices, setConfig]);

  // Filtrado de familias
  const familiasFiltradas = useMemo(() => {
    if (isSearchActive && ragProductos && ragProductos.length > 0) {
      return ragProductos;
    }

    const term = (activeSearchTerm || searchQuery).trim().toLowerCase();

    const filtrados = productos.filter((p) => {
      const matchCategoria = selectedCategory === 'Todas' || p.categoria === selectedCategory;
      const matchSearch = !term || (
        p.nombre.toLowerCase().includes(term) || 
        (p.descripcion && p.descripcion.toLowerCase().includes(term)) ||
        (p.categoria && p.categoria.toLowerCase().includes(term)) ||
        (p.presentaciones && p.presentaciones.some(pr => pr.nombre.toLowerCase().includes(term) || (pr.etiqueta && pr.etiqueta.toLowerCase().includes(term))))
      );
      return matchCategoria && matchSearch;
    });

    return filtrados.sort((a, b) => {
      if (a.destacado && !b.destacado) return -1;
      if (!a.destacado && b.destacado) return 1;
      return 0;
    });
  }, [productos, selectedCategory, searchQuery, activeSearchTerm, ragProductos, isSearchActive]);

  // Paginación calculada
  const totalPages = Math.ceil(familiasFiltradas.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const familiasPaginadas = useMemo(() => {
    return familiasFiltradas.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [familiasFiltradas, startIndex]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      setTimeout(() => {
        const productsGrid = document.getElementById('productos-grid');
        if (productsGrid) {
          const y = productsGrid.getBoundingClientRect().top + window.scrollY - 120;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 50);
    }
  };

  return (
    <div className="container mx-auto px-4 py-4 sm:py-8 max-w-7xl">
      
      {/* Hero Carousel Dinámico (Visible en modo catálogo normal) */}
      {!isSearchActive && banners.length > 0 && (
        <HeroCarousel banners={banners} />
      )}

      {/* Categorías (Filtros con flechas y arrastre) */}
      {!isSearchActive && (
        <div className="relative mb-6 sm:mb-10 group flex items-center h-12 sm:h-14">
          {/* Flecha Izquierda */}
          <button 
            onClick={() => scrollByAmount(-200)}
            className="absolute left-0 top-0 bottom-0 z-10 w-10 sm:w-12 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm shadow-[4px_0_12px_rgba(0,0,0,0.05)] border-r border-y border-slate-200 dark:border-slate-800 flex items-center justify-center hidden sm:flex text-slate-500 hover:text-amber-500 transition-colors rounded-r-xl cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div 
            ref={scrollRef}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            className="overflow-x-auto h-full flex-1 scroll-smooth cursor-grab active:cursor-grabbing hide-scrollbar flex items-center"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <div className="flex gap-3 px-2 sm:px-14">
              {CATEGORIAS.map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleCategoryClick(cat)}
                  className={`whitespace-nowrap px-6 py-2.5 rounded-full font-medium transition-all duration-300 select-none cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20 scale-105'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-amber-500 hover:text-amber-500'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Flecha Derecha */}
          <button 
            onClick={() => scrollByAmount(200)}
            className="absolute right-0 top-0 bottom-0 z-10 w-10 sm:w-12 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm shadow-[-4px_0_12px_rgba(0,0,0,0.05)] border-l border-y border-slate-200 dark:border-slate-800 flex items-center justify-center hidden sm:flex text-slate-500 hover:text-amber-500 transition-colors rounded-l-xl cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Estilo para ocultar scrollbar */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .dragging-active button {
          pointer-events: none !important;
        }
      `}} />

      {/* ── SECCIÓN DE RESULTADOS DE BÚSQUEDA (TARJETAS DE FAMILIA RELACIONADAS) ── */}
      {isSearchActive ? (
        <div id="productos-grid" className="mb-6 space-y-4">
          <div className="bg-slate-50 dark:bg-slate-900/80 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  Resultados para &quot;{activeSearchTerm || searchQuery}&quot;
                </h2>
                {searchNivel === 2 ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/70 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 text-xs font-extrabold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-violet-500" /> Búsqueda Semántica IA
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold">
                    Búsqueda Exacta
                  </span>
                )}
                {searchLatencyMs !== null && (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {searchLatencyMs}ms
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {familiasFiltradas.length} familia{familiasFiltradas.length !== 1 ? 's' : ''} relacionada{familiasFiltradas.length !== 1 ? 's' : ''} encontrada{familiasFiltradas.length !== 1 ? 's' : ''}. Haz clic en una familia para ver y pedir sus productos.
              </p>
            </div>

            <button
              type="button"
              onClick={clearSearch}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-700 hover:text-rose-600 dark:text-slate-200 dark:hover:text-rose-400 border border-slate-300 dark:border-slate-700 hover:border-rose-300 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs"
            >
              <X className="w-3.5 h-3.5" />
              <span>Ver Catálogo Completo</span>
            </button>
          </div>

          {/* Grid de Tarjetas de Familias Resultantes */}
          {familiasFiltradas.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
              {familiasFiltradas.map((familia) => (
                <ProductCard 
                  key={familia.id} 
                  producto={familia} 
                  onSelect={handleOpenFamily} 
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
              <Package className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1">
                No se encontraron familias de productos
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                Prueba con otro término de búsqueda o limpia el filtro para ver todas las familias disponibles.
              </p>
              <button
                type="button"
                onClick={clearSearch}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
              >
                Restablecer Catálogo
              </button>
            </div>
          )}
        </div>
      ) : (
        /* ── SECCIÓN DE CATÁLOGO GENERAL (TARJETAS DE FAMILIAS EXCLUSIVAS) ── */
        <div id="productos-grid">
          <div className="mb-4 sm:mb-6 flex items-center justify-between pt-0 sm:pt-4">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
              {selectedCategory === 'Todas' ? 'Familias de Productos' : selectedCategory}
            </h2>
            <span className="text-sm text-slate-500">
              {familiasFiltradas.length > 0 ? (
                <>Mostrando <span className="font-semibold text-slate-700 dark:text-slate-300">{startIndex + 1} - {Math.min(startIndex + ITEMS_PER_PAGE, familiasFiltradas.length)}</span> de {familiasFiltradas.length} familias</>
              ) : (
                '0 familias'
              )}
            </span>
          </div>

          {familiasPaginadas.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                {familiasPaginadas.map((familia) => (
                  <ProductCard 
                    key={familia.id} 
                    producto={familia} 
                    onSelect={handleOpenFamily} 
                  />
                ))}
              </div>

              {/* Barra de Paginación */}
              {totalPages > 1 && (
                <div className="mt-8 sm:mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-xs sm:text-sm text-slate-500 font-medium">
                    Página <span className="text-slate-900 dark:text-white font-bold">{currentPage}</span> de {totalPages}
                  </span>

                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {/* Botón Anterior */}
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span className="hidden sm:inline">Anterior</span>
                    </button>

                    {/* Páginas Numeradas */}
                    <div className="flex items-center gap-1 px-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        if (
                          page === 1 ||
                          page === totalPages ||
                          Math.abs(page - currentPage) <= 1
                        ) {
                          return (
                            <button
                              key={page}
                              onClick={() => handlePageChange(page)}
                              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                                currentPage === page
                                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/30 scale-105'
                                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                              }`}
                            >
                              {page}
                            </button>
                          );
                        } else if (
                          page === currentPage - 2 ||
                          page === currentPage + 2
                        ) {
                          return (
                            <span key={page} className="px-1 text-slate-400 text-xs select-none">
                              ...
                            </span>
                          );
                        }
                        return null;
                      })}
                    </div>

                    {/* Botón Siguiente */}
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer"
                    >
                      <span className="hidden sm:inline">Siguiente</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
              <Package className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">No se encontraron familias</h3>
              <p className="text-slate-500">Prueba cambiando la categoría o configurando familias en el POS.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal de Presentaciones de Familia (SIN IMÁGENES) */}
      <FamilyDetailModal 
        familia={selectedFamilyForModal}
        isOpen={isFamilyModalOpen}
        onClose={handleCloseFamilyModal}
      />

    </div>
  );
}
