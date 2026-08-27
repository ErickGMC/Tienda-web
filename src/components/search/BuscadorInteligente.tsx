'use client';

/**
 * BuscadorInteligente.tsx
 * Barra de búsqueda profesional para la Tienda Web con estado IA dinámico.
 *
 * CARACTERÍSTICAS:
 *  - Activación exclusivamente bajo demanda (al presionar Enter o clic en botón Buscar).
 *  - Los resultados se renderizan directamente en el cuerpo principal de la web (sin dropdown).
 *  - Soporte de Inteligencia Artificial Semántica (Nivel 2) y búsqueda exacta con métricas.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Sparkles, X, Loader2 } from 'lucide-react';
import { Producto } from '@/types/producto';
import { useTiendaStore } from '@/lib/store';

interface SearchResult {
  productos: Producto[];
  nivel: 1 | 2;
  latencyMs: number;
  iaHabilitada: boolean;
  iaCombosHabilitada?: boolean;
}

interface BuscadorInteligenteProps {
  mostrarCombos?: boolean;
  onAbrirCombos?: () => void;
  className?: string;
}

const MIN_CHARS = 2;

export default function BuscadorInteligente({
  mostrarCombos = true,
  onAbrirCombos,
  className = '',
}: BuscadorInteligenteProps) {
  const { 
    searchQuery,
    setSearchInfo, 
    setIsSearching, 
    clearSearch, 
    isSearching 
  } = useTiendaStore();
  
  const [inputValue, setInputValue] = useState(searchQuery || '');
  const [iaHabilitada, setIaHabilitada] = useState(false);
  const [iaCombosHabilitada, setIaCombosHabilitada] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sincronizar input local si el store se resetea externamente
  useEffect(() => {
    setInputValue(searchQuery || '');
  }, [searchQuery]);

  // ── Verificar estado de IA al montar (única llamada) ──────────────────────
  useEffect(() => {
    async function verificarIA() {
      try {
        const res = await fetch('/api/ia-status', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setIaHabilitada(Boolean(data.iaHabilitada));
          setIaCombosHabilitada(Boolean(data.iaCombosHabilitada));
        }
      } catch {
        setIaHabilitada(false);
        setIaCombosHabilitada(false);
      }
    }
    verificarIA();
  }, []);

  // ── Core: realizar búsqueda bajo demanda ─────────────────────────────────
  const realizarBusqueda = useCallback(async (termino: string) => {
    const terminoLimpio = termino.trim();

    if (terminoLimpio.length < MIN_CHARS) {
      if (terminoLimpio.length === 0) {
        clearSearch();
      }
      return;
    }

    // Cancelar la petición HTTP anterior si aún está en curso
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsSearching(true);
    try {
      const response = await fetch('/api/search-ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termino: terminoLimpio }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error('Error en búsqueda');

      const data: SearchResult = await response.json();

      setIaHabilitada(Boolean(data.iaHabilitada));
      if (data.iaCombosHabilitada !== undefined) {
        setIaCombosHabilitada(Boolean(data.iaCombosHabilitada));
      }

      // Enviar resultados al store para renderizarlos en el CUERPO de la web
      setSearchInfo({
        term: terminoLimpio,
        productos: data.productos || [],
        nivel: data.nivel,
        latencyMs: data.latencyMs ?? null,
      });

      // Scroll suave hacia la sección de resultados en el cuerpo
      setTimeout(() => {
        const productsGrid = document.getElementById('productos-grid');
        if (productsGrid) {
          const y = productsGrid.getBoundingClientRect().top + window.scrollY - 100;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 60);

    } catch (err: any) {
      if (err.name !== 'AbortError') {
        // Fallback exacto en el cliente
        setSearchInfo({
          term: terminoLimpio,
          productos: null, // indica fallback a filtrado regular
          nivel: 1,
          latencyMs: null
        });
      }
    } finally {
      if (abortControllerRef.current === controller) {
        setIsSearching(false);
      }
    }
  }, [clearSearch, setIsSearching, setSearchInfo]);

  // Manejador del Input (solo actualiza el estado local sin disparar HTTP)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    if (val.trim() === '') {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      clearSearch();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      realizarBusqueda(inputValue);
    }
  };

  const handleLimpiar = () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    setInputValue('');
    clearSearch();
    inputRef.current?.focus();
  };

  return (
    <div className={`relative w-full max-w-2xl mx-auto ${className}`}>
      {/* ── Barra de Búsqueda ─────────────────────────────────────────────── */}
      <div className="relative group">
        {/* Resplandor ambiental de fondo */}
        <div
          className={`absolute -inset-0.5 rounded-full blur transition-all duration-500 ${
            iaHabilitada
              ? 'bg-gradient-to-r from-violet-500 to-indigo-600 opacity-30 group-focus-within:opacity-75'
              : 'bg-gradient-to-r from-amber-400 to-orange-500 opacity-20 group-focus-within:opacity-50'
          }`}
        />

        <div className="relative flex items-center w-full bg-white dark:bg-slate-900 rounded-full shadow-sm border border-slate-200 dark:border-slate-800 p-1.5 pl-4 overflow-hidden">
          {/* Icono de Búsqueda */}
          <div className="text-slate-400 pr-1 sm:pr-2 flex-shrink-0">
            <Search className="w-4 h-4 text-amber-500" />
          </div>

          {/* Input de Búsqueda */}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Describe lo que buscas..."
            className="w-full py-1.5 sm:py-2 px-2 bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none text-xs sm:text-sm min-w-0 font-medium"
            autoComplete="off"
          />

          {/* Botones de Acción */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0 pl-1">
            {isSearching && (
              <Loader2 className="w-4 h-4 text-amber-500 animate-spin mr-1" />
            )}

            {inputValue && !isSearching && (
              <button
                type="button"
                onClick={handleLimpiar}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full transition-colors cursor-pointer"
                title="Limpiar búsqueda"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Botón Buscar (Disparo explícito) */}
            <button
              type="button"
              onClick={() => realizarBusqueda(inputValue)}
              disabled={isSearching}
              className="p-1.5 sm:p-2 px-3 sm:px-3.5 rounded-full text-white font-bold text-xs flex items-center gap-1.5 justify-center transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/20"
              title="Buscar ahora"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-xs">Buscar</span>
            </button>

            {/* Botón "Armar Combo" */}
            {mostrarCombos && iaCombosHabilitada && onAbrirCombos && (
              <button
                type="button"
                onClick={onAbrirCombos}
                className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-[11px] sm:text-xs font-bold rounded-full transition-all shadow-sm flex-shrink-0 cursor-pointer"
                title="Crear combo automático"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-100" />
                <span className="inline font-bold">Crear Combo</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
