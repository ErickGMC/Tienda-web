'use client'

import React, { useMemo, useEffect } from 'react';
import { Producto, CategoriaProducto } from '@/types/producto';
import { Banner, WebConfig } from '@/lib/actions';
import ProductCard from './ProductCard';
import HeroCarousel from '@/components/ui/HeroCarousel';
import { useTiendaStore } from '@/lib/store';

interface TiendaCatalogProps {
  productos: Producto[];
  banners: Banner[];
  config: WebConfig;
}

const CATEGORIAS: (CategoriaProducto | 'Todas')[] = [
  'Todas', 'Abarrotes', 'Frutas y Verduras', 'Limpieza', 'Bazar', 'Servicios', 'Otros'
];

export default function TiendaCatalog({ productos, banners, config }: TiendaCatalogProps) {
  const { searchQuery, selectedCategory, setSelectedCategory, setShowPrices } = useTiendaStore();

  // Sincronizar la configuración general (mostrarPrecios) con el store en el cliente
  useEffect(() => {
    if (config && config.mostrarPrecios !== undefined) {
      setShowPrices(config.mostrarPrecios);
    }
    // Guardar el número de whatsapp en localStorage para que Navbar e InfoModal puedan leerlo
    if (config && config.whatsapp) {
      localStorage.setItem('tienda_whatsapp', config.whatsapp);
    }
    if (config && config.ubicacion) {
      localStorage.setItem('tienda_ubicacion', config.ubicacion);
    }
  }, [config, setShowPrices]);

  // Filtrado optimizado con useMemo
  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      const matchCategoria = selectedCategory === 'Todas' || p.categoria === selectedCategory;
      const matchSearch = p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.descripcion.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategoria && matchSearch;
    });
  }, [productos, selectedCategory, searchQuery]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      
      {/* Hero Carousel Dinámico */}
      {!searchQuery && selectedCategory === 'Todas' && banners.length > 0 && (
        <HeroCarousel banners={banners} />
      )}

      {/* Categorías (Filtros) */}
      <div className="mb-10 overflow-x-auto pb-4 scrollbar-hide">
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
