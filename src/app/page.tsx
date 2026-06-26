'use client'

import { useTiendaStore } from "@/lib/store";
import { Producto, CategoriaProducto } from "@/types/producto";
import ProductCard from "@/components/productos/ProductCard";
import HeroCarousel from "@/components/ui/HeroCarousel";
import { useMemo } from "react";

// Mock data para probar la UI antes de conectar Firestore
const mockProductos: Producto[] = [
  {
    id: "1",
    nombre: "Arroz Costeño Extra 1kg",
    descripcion: "Arroz de primera calidad, granos enteros ideales para cualquier comida.",
    categoria: "Abarrotes",
    precio: 4.50,
    unidadMedida: "kg",
    disponible: true,
    destacado: true,
    etiquetas: ["almuerzo", "basico"],
  },
  {
    id: "2",
    nombre: "Aceite Primor Premium 1L",
    descripcion: "Aceite vegetal 100% puro. Sin colesterol.",
    categoria: "Abarrotes",
    precio: 9.80,
    unidadMedida: "litro",
    disponible: true,
    destacado: true,
    etiquetas: ["cocina", "frituras"],
  },
  {
    id: "3",
    nombre: "Plátano Seda",
    descripcion: "Plátanos frescos y dulces, perfectos para postres o comer solos.",
    categoria: "Frutas y Verduras",
    precio: 3.50,
    unidadMedida: "kg",
    disponible: true,
    destacado: false,
    etiquetas: ["saludable", "fruta", "desayuno"],
  },
  {
    id: "4",
    nombre: "Menú del Día - Pollo al Horno",
    descripcion: "Incluye sopa, plato de fondo (Pollo al horno con puré y arroz) y refresco.",
    categoria: "Servicios",
    precio: 12.00,
    unidadMedida: "servicio",
    disponible: true,
    destacado: true,
    etiquetas: ["comida", "caliente", "almuerzo", "rapido"],
  },
  {
    id: "5",
    nombre: "Detergente Ariel 1kg",
    descripcion: "Detergente en polvo con poder quitamanchas.",
    categoria: "Limpieza",
    precio: 11.20,
    unidadMedida: "unidad",
    disponible: true,
    destacado: false,
    etiquetas: ["ropa", "lavado"],
  },
  {
    id: "6",
    nombre: "Gaseosa Coca-Cola 3L",
    descripcion: "Gaseosa sabor original, tamaño familiar.",
    categoria: "Golosinas y Bebidas",
    precio: 10.50,
    unidadMedida: "unidad",
    disponible: true,
    destacado: true,
    etiquetas: ["refresco", "fiesta", "frio"],
  }
];

const CATEGORIAS: (CategoriaProducto | 'Todas')[] = [
  'Todas', 'Abarrotes', 'Frutas y Verduras', 'Limpieza', 'Golosinas y Bebidas', 'Servicios'
];

export default function Home() {
  const { searchQuery, selectedCategory, setSelectedCategory } = useTiendaStore();

  // Filtrado optimizado con useMemo (Preparando el terreno para paginación/backend)
  const productosFiltrados = useMemo(() => {
    return mockProductos.filter((p) => {
      const matchCategoria = selectedCategory === 'Todas' || p.categoria === selectedCategory;
      const matchSearch = p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.descripcion.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategoria && matchSearch;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      
      {/* Hero Carousel */}
      {!searchQuery && selectedCategory === 'Todas' && (
        <HeroCarousel />
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
