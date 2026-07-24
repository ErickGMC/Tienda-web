'use client';

/**
 * BuscadorInteligente.tsx
 * Barra de búsqueda ultra-eficiente para la Tienda Web.
 *
 * ESTRATEGIA DE EFICIENCIA HÍBRIDA (Máxima velocidad, $0 desperdicio):
 *  1. Búsqueda por palabras cortas / nombres ("leche", "arroz"):
 *     Filtra localmente a 0ms de latencia ($0 costo API).
 *  2. Frases complejas / Intención ("algo para el desayuno", "snacks para ver películas"):
 *     Activa la búsqueda semántica vectorial (Nivel 2) tras una pausa de 450ms o al presionar Enter/Buscar.
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
  mostrarCombos?: boolean;
  onAbrirCombos?: () => void;
  className?: string;
}

export default function BuscadorInteligente({
  mostrarCombos = true,
  onAbrirCombos,
  className = '',
}: BuscadorInteligenteProps) {
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

  // Verificar estado de la IA al cargar
  useEffect(() => {
    async function verificarIA() {
      try {
        const res = await fetch('/api/search-ia', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ termino: 'test' }),
        });
        if (res.ok) {
          const data: SearchResult = await res.json();
          setIaHabilitada(data.iaHabilitada);
        }
      } catch {
        setIaHabilitada(false);
      }
    }
    verificarIA();
  }, []);

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

  const realizarBusqueda = useCallback(async (termino: string, forzarIA = false) => {
    const terminoLimpio = termino.trim();

    if (terminoLimpio.length < 2) {
      setSearchQuery(terminoLimpio);
      setResultados([]);
      setMostrarDropdown(false);
      setNivelUsado(null);
      return;
    }

    // Filtrar catálogo principal en el store instantáneamente
    setSearchQuery(terminoLimpio);

    const palabras = terminoLimpio.split(/\s+/);
    const esFraseLarga = palabras.length >= 3;

    // Si la IA no está habilitada o es una palabra simple (sin forzar), usar filtrado local directo ($0 costo)
    if (!iaHabilitada || (!esFraseLarga && !forzarIA)) {
      setNivelUsado(1);
      setMostrarDropdown(false);
      return;
    }

    // Nivel 2: Búsqueda Semántica Vectorial (solo si es frase larga o presiona Enter/Buscar)
    setIsLoading(true);
    try {
      const response = await fetch('/api/search-ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termino: terminoLimpio }),
      });

      if (!response.ok) throw new Error('Error en búsqueda semántica');

      const data: SearchResult = await response.json();
      setResultados(data.productos);
      setNivelUsado(data.nivel);
      setIaHabilitada(data.iaHabilitada);
      setMostrarDropdown(data.productos.length > 0);
    } catch {
      setNivelUsado(1);
    } finally {
      setIsLoading(false);
    }
  }, [iaHabilitada, setSearchQuery]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    // Filtrar localmente de inmediato (0ms latencia)
    setSearchQuery(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Solo si es una frase larga (>2 palabras), activar la IA tras 450ms
    const palabras = val.trim().split(/\s+/);
    if (iaHabilitada && palabras.length >= 3) {
      debounceRef.current = setTimeout(() => {
        realizarBusqueda(val, true);
      }, 450);
    } else {
      setMostrarDropdown(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      realizarBusqueda(inputValue, true);
    }
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
      
      {/* ── Badge visual de IA Activada ───────────────────────────────── */}
      {iaHabilitada && (
        <div className="flex items-center justify-between px-1 mb-1.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gradient-to-r from-violet-500/10 to-indigo-500/10 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
            <Sparkles className="w-3 h-3 text-violet-500 animate-pulse" />
            Búsqueda Semántica IA Activada
          </span>
          {nivelUsado === 2 && (
            <span className="text-[10px] text-violet-600 dark:text-violet-400 font-semibold flex items-center gap-1">
              <Zap className="w-3 h-3" /> Vector RAG Activo
            </span>
          )}
        </div>
      )}

      {/* ── Barra de Búsqueda ───────────────────────────────────────── */}
      <div className="relative group">
        <div
          className={`absolute -inset-0.5 rounded-2xl blur transition-all duration-500 ${
            iaHabilitada
              ? 'bg-gradient-to-r from-violet-400 to-indigo-500 opacity-30 group-focus-within:opacity-70'
              : 'bg-gradient-to-r from-amber-400 to-orange-500 opacity-20 group-focus-within:opacity-50'
          }`}
        />

        <div className="relative flex items-center w-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          
          <div className="pl-4 pr-2 flex-shrink-0">
            {isLoading ? (
              <Loader2 className="w-5 h-5 text-violet-500 animate-spin" />
            ) : iaHabilitada ? (
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
            onKeyDown={handleKeyDown}
            onFocus={() => resultados.length > 0 && setMostrarDropdown(true)}
            placeholder={
              iaHabilitada
                ? '✨ Busca o describe lo que necesitas (Ej: algo para el desayuno)...'
                : 'Busca productos, abarrotes, bebidas...'
            }
            className="w-full py-3.5 px-2 bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none text-sm"
            autoComplete="off"
          />

          <div className="flex items-center gap-1 pr-2 flex-shrink-0">
            {inputValue && (
              <button
                type="button"
                onClick={handleLimpiar}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                title="Limpiar búsqueda"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Botón Buscar / Consultar */}
            <button
              type="button"
              onClick={() => {
                if (debounceRef.current) clearTimeout(debounceRef.current);
                realizarBusqueda(inputValue, true);
              }}
              className={`px-3 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                iaHabilitada
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-700 hover:from-violet-700 hover:to-indigo-800 shadow-sm shadow-violet-300 dark:shadow-none'
                  : 'bg-amber-500 hover:bg-amber-600 shadow-sm'
              }`}
              title="Presiona Enter o haz clic para buscar"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Buscar</span>
            </button>

            {/* Botón Armar Combo */}
            {mostrarCombos && iaHabilitada && onAbrirCombos && (
              <button
                type="button"
                onClick={onAbrirCombos}
                className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all shadow-sm shadow-emerald-200 dark:shadow-emerald-900 ml-1 cursor-pointer"
                title="Crear combo personalizado con IA"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Armar Combo</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Dropdown de Resultados */}
      {mostrarDropdown && resultados.length > 0 && (
        <div className="absolute top-full mt-3 left-0 right-0 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">
              {resultados.length} resultado{resultados.length !== 1 ? 's' : ''}
              {nivelUsado === 2 && (
                <span className="ml-2 text-violet-500 font-semibold">✨ Búsqueda Semántica</span>
              )}
            </span>
            <button
              onClick={() => setMostrarDropdown(false)}
              className="text-slate-400 hover:text-slate-600 text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800">
            {resultados.map((producto) => (
              <button
                key={producto.id}
                onClick={() => handleSeleccionarProducto(producto)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left group"
              >
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

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {producto.nombre}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{producto.categoria}</p>
                </div>

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
