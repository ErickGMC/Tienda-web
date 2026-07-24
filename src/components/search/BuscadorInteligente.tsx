'use client';

/**
 * BuscadorInteligente.tsx
 * Barra de búsqueda semántica para la Tienda Web.
 *
 * Funciona en 3 modos automáticos:
 *  1. Sin IA (IA deshabilitada): Actualiza searchQuery del store → filtrado local instantáneo.
 *  2. Búsqueda Semántica (IA habilitada, frase >2 palabras): Llama a /api/search-ia con debounce.
 *  3. Armador de Combos: Botón "✨ Crear Combo" que abre el IAComboModal.
 *
 * Siempre muestra resultados como tarjetas visuales en un dropdown,
 * no como texto de chat (máxima eficiencia de conversión).
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Sparkles, X, Loader2, Zap, ShoppingCart } from 'lucide-react';
import { Producto } from '@/types/producto';
import { useTiendaStore } from '@/lib/store';
import Image from 'next/image';

interface SearchResult {
  productos: Producto[];
  nivel: 1 | 2;
  latencyMs: number;
  iaHabilitada: boolean;
}

interface BuscadorInteligenteProps {
  /** Muestra el botón de Armado de Combos si está habilitado */
  mostrarCombos?: boolean;
  onAbrirCombos?: () => void;
  className?: string;
}

export default function BuscadorInteligente({ mostrarCombos = true, onAbrirCombos, className = '' }: BuscadorInteligenteProps) {
  const { setSearchQuery, addToConsulta, showToast } = useTiendaStore();
  const [inputValue, setInputValue] = useState('');
  const [resultados, setResultados] = useState<Producto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [nivelUsado, setNivelUsado] = useState<1 | 2 | null>(null);
  const [iaHabilitada, setIaHabilitada] = useState(false);
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMostrarDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const realizarBusqueda = useCallback(async (termino: string) => {
    const terminoLimpio = termino.trim();

    // Si es muy corto, solo filtrar localmente (Nivel 0)
    if (terminoLimpio.length < 2) {
      setSearchQuery(terminoLimpio);
      setResultados([]);
      setMostrarDropdown(false);
      setNivelUsado(null);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/search-ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termino: terminoLimpio }),
      });

      if (!response.ok) throw new Error('Error en búsqueda');

      const data: SearchResult = await response.json();
      setResultados(data.productos);
      setNivelUsado(data.nivel);
      setIaHabilitada(data.iaHabilitada);
      setMostrarDropdown(data.productos.length > 0);

      // También actualizamos el store para que el catálogo principal se filtre
      setSearchQuery(terminoLimpio);
    } catch (err) {
      // Fallback silencioso: solo actualizar el store
      setSearchQuery(terminoLimpio);
    } finally {
      setIsLoading(false);
    }
  }, [setSearchQuery]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    // Debounce de 350ms para no saturar la API
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      realizarBusqueda(val);
    }, 350);
  };

  const handleLimpiar = () => {
    setInputValue('');
    setSearchQuery('');
    setResultados([]);
    setMostrarDropdown(false);
    setNivelUsado(null);
    inputRef.current?.focus();
  };

  const handleSeleccionarProducto = (producto: Producto) => {
    addToConsulta(producto);
    showToast(`✅ ${producto.nombre} agregado a tu consulta`);
    setMostrarDropdown(false);
    setInputValue('');
    setSearchQuery('');
  };

  return (
    <div ref={dropdownRef} className={`relative w-full max-w-2xl mx-auto ${className}`}>
      {/* ── Barra de Búsqueda ───────────────────────────────────────── */}
      <div className="relative group">
        {/* Glow dinámico: ámbar sin IA, violeta con IA */}
        <div
          className={`absolute -inset-0.5 rounded-2xl blur transition-all duration-500 ${
            iaHabilitada && inputValue.trim().split(' ').length >= 3
              ? 'bg-gradient-to-r from-violet-400 to-indigo-500 opacity-50 group-focus-within:opacity-80'
              : 'bg-gradient-to-r from-amber-400 to-orange-500 opacity-20 group-focus-within:opacity-50'
          }`}
        />

        <div className="relative flex items-center w-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Icono de búsqueda / IA */}
          <div className="pl-4 pr-2 flex-shrink-0">
            {isLoading ? (
              <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
            ) : nivelUsado === 2 ? (
              <Sparkles className="w-5 h-5 text-violet-500" />
            ) : (
              <Search className="w-5 h-5 text-slate-400" />
            )}
          </div>

          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => resultados.length > 0 && setMostrarDropdown(true)}
            placeholder={iaHabilitada ? '✨ Busca o describe lo que necesitas...' : 'Busca productos, abarrotes, bebidas...'}
            className="w-full py-3.5 px-2 bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none text-sm"
            autoComplete="off"
          />

          {/* Botones de acción */}
          <div className="flex items-center gap-1 pr-2 flex-shrink-0">
            {inputValue && (
              <button
                onClick={handleLimpiar}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                title="Limpiar búsqueda"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Botón "Armar Combo" — solo visible si IA habilitada */}
            {mostrarCombos && iaHabilitada && onAbrirCombos && (
              <button
                onClick={onAbrirCombos}
                className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-violet-500 to-indigo-600 text-white text-xs font-bold rounded-xl hover:from-violet-600 hover:to-indigo-700 transition-all shadow-sm shadow-violet-200 dark:shadow-violet-900 ml-1"
                title="Crear combo personalizado con IA"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Armar Combo</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Etiqueta de nivel IA (solo en desarrollo o para debug) ───── */}
      {nivelUsado && inputValue && (
        <div className="absolute -bottom-6 right-0 flex items-center gap-1">
          {nivelUsado === 2 ? (
            <span className="text-[10px] text-violet-500 font-bold flex items-center gap-0.5">
              <Sparkles className="w-2.5 h-2.5" /> Búsqueda Semántica
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 font-medium flex items-center gap-0.5">
              <Zap className="w-2.5 h-2.5" /> Búsqueda rápida
            </span>
          )}
        </div>
      )}

      {/* ── Dropdown de Resultados ───────────────────────────────────── */}
      {mostrarDropdown && resultados.length > 0 && (
        <div className="absolute top-full mt-3 left-0 right-0 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden">
          {/* Header del dropdown */}
          <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">
              {resultados.length} resultado{resultados.length !== 1 ? 's' : ''}
              {nivelUsado === 2 && (
                <span className="ml-2 text-violet-500">✨ Semántico</span>
              )}
            </span>
            <button
              onClick={() => setMostrarDropdown(false)}
              className="text-slate-400 hover:text-slate-600 text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Lista de productos */}
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800">
            {resultados.map((producto) => (
              <button
                key={producto.id}
                onClick={() => handleSeleccionarProducto(producto)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left group"
              >
                {/* Imagen */}
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                  {producto.imagenUrl ? (
                    <Image
                      src={producto.imagenUrl}
                      alt={producto.nombre}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 text-lg">🛒</div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {producto.nombre}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{producto.categoria}</p>
                </div>

                {/* Precio + CTA */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {producto.precio > 0 && (
                    <span className="text-sm font-bold text-emerald-600">
                      S/ {producto.precio.toFixed(2)}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 group-hover:text-violet-500 flex items-center gap-0.5 transition-colors">
                    <ShoppingCart className="w-3 h-3" /> Agregar
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
