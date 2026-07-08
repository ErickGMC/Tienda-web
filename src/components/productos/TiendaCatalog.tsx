'use client'

import React, { useMemo, useEffect } from 'react';
import { Producto, CategoriaProducto } from '@/types/producto';
import { Banner, WebConfig, EmpresaConfig } from '@/lib/actions';
import ProductCard from './ProductCard';
import HeroCarousel from '@/components/ui/HeroCarousel';
import { useTiendaStore } from '@/lib/store';

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
  const { searchQuery, selectedCategory, setSelectedCategory, setShowPrices, setConfig } = useTiendaStore();

  // Sincronizar la configuración general
  useEffect(() => {
    if (config && config.mostrarPrecios !== undefined) {
      setShowPrices(config.mostrarPrecios);
    }
    // Guardar configs globales en el store
    setConfig(config || {}, empresa || {});
  }, [config, empresa, setShowPrices, setConfig]);

  // Filtrado optimizado con useMemo
  const productosFiltrados = useMemo(() => {
    const filtrados = productos.filter((p) => {
      const matchCategoria = selectedCategory === 'Todas' || p.categoria === selectedCategory;
      const matchSearch = p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.descripcion.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategoria && matchSearch;
    });

    return filtrados.sort((a, b) => {
      if (a.destacado && !b.destacado) return -1;
      if (!a.destacado && b.destacado) return 1;
      return 0;
    });
  }, [productos, selectedCategory, searchQuery]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      
      {/* Hero Carousel Dinámico */}
      {!searchQuery && selectedCategory === 'Todas' && banners.length > 0 && (
        <HeroCarousel banners={banners} />
      )}

      {/* Categorías (Filtros) */}
      <div className="mb-10 overflow-x-auto pb-4 custom-scrollbar">
        <div className="flex gap-3">
          {CATEGORIAS.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`whitespace-nowrap px-6 py-2.5 rounded-full font-medium transition-all duration-300 ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:text-emerald-500'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Productos */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
          {searchQuery ? `Resultados para "${searchQuery}"` : selectedCategory === 'Todas' ? 'Productos Destacados' : selectedCategory}
        </h2>
        <span className="text-sm text-slate-500">
          {productosFiltrados.length} productos
        </span>
      </div>

      {productosFiltrados.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
          {productosFiltrados.map((producto) => (
            <ProductCard key={producto.id} producto={producto} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">No se encontraron productos</h3>
          <p className="text-slate-500">Prueba buscando con otros términos o cambia la categoría.</p>
        </div>
      )}

    </div>
  );
}
