'use client';

/**
 * BuscadorInteligente.tsx
 * Barra de búsqueda profesional para la Tienda Web con estado IA dinámico.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Sparkles, X, Loader2, ShoppingCart } from 'lucide-react';
import { Producto } from '@/types/producto';
import { useTiendaStore } from '@/lib/store';
import Image from 'next/image';

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

export default function BuscadorInteligente({
  mostrarCombos = true,
  onAbrirCombos,
  className = '',
}: BuscadorInteligenteProps) {
  const { setSearchQuery, setRagProductos, addToConsulta, showToast } = useTiendaStore();
  const [inputValue, setInputValue] = useState('');
  const [resultados, setResultados] = useState<Producto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [nivelUsado, setNivelUsado] = useState<1 | 2 | null>(null);
  const [iaHabilitada, setIaHabilitada] = useState(false);
  const [iaCombosHabilitada, setIaCombosHabilitada] = useState(false);
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Verificar el estado de la IA al cargar la página (una sola llamada para ambos estados)
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

    if (terminoLimpio.length < 2) {
      setSearchQuery(terminoLimpio);
      setRagProductos(null);
      setResultados([]);
      setMostrarDropdown(false);
      setNivelUsado(null);
      return;
    }

    // Filtrar catálogo principal en el store instantáneamente
    setSearchQuery(terminoLimpio);

    // Cancelar la petición HTTP anterior si aún está en curso
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    try {
      const response = await fetch('/api/search-ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termino: terminoLimpio }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error('Error en búsqueda');

      const data: SearchResult = await response.json();
      setResultados(data.productos);
      setNivelUsado(data.nivel);
      setIaHabilitada(Boolean(data.iaHabilitada));
      setMostrarDropdown(data.productos.length > 0);
      // Compartir los resultados semánticos con la cuadrícula principal del catálogo
      setRagProductos(data.productos.length > 0 ? data.productos : null);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setNivelUsado(1);
      }
    } finally {
      if (abortControllerRef.current === controller) {
        setIsLoading(false);
      }
    }
  }, [setSearchQuery, setRagProductos]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    // Capa 0: Filtrado local en el store a 0ms (sin costo de API)
    setSearchQuery(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    const valLimpia = val.trim();
    if (valLimpia.length >= 2) {
      // Debounce inteligente:
      // - Si la IA está activa y son >= 3 palabras o frase descriptiva: 600ms (cuida cuota de Gemini API)
      // - Si es término corto / 1-2 palabras: 350ms (respuesta rápida)
      const palabras = valLimpia.split(/\s+/);
      const requiereDebounceLargo = iaHabilitada && (palabras.length >= 3 || valLimpia.length >= 15);
      const tiempoDebounce = requiereDebounceLargo ? 400 : 300;

      debounceRef.current = setTimeout(() => {
        realizarBusqueda(val);
      }, tiempoDebounce);
    } else {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      setMostrarDropdown(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      realizarBusqueda(inputValue);
    }
  };

  const handleLimpiar = () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
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
        
        {/* Resplandor ambiental de fondo */}
        <div
          className={`absolute -inset-0.5 rounded-full blur transition-all duration-500 ${
            iaHabilitada
              ? 'bg-gradient-to-r from-violet-500 to-indigo-600 opacity-30 group-focus-within:opacity-75'
              : 'bg-gradient-to-r from-amber-400 to-orange-500 opacity-20 group-focus-within:opacity-50'
          }`}
        />

        <div className="relative flex items-center w-full bg-white dark:bg-slate-900 rounded-full shadow-sm border border-slate-200 dark:border-slate-800 p-1.5 pl-4 overflow-hidden">
          
          {/* Símbolo discreto de IA — APARECE ÚNICAMENTE SI LA IA ESTÁ HABILITADA */}
          {iaHabilitada ? (
            <div className="flex items-center gap-1 pr-2 py-0.5 px-2.5 rounded-full bg-violet-100 dark:bg-violet-950/70 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 text-[11px] font-extrabold flex-shrink-0 animate-fade-in">
              <Sparkles className="w-3.5 h-3.5 text-violet-500 animate-pulse" />
              <span>IA</span>
            </div>
          ) : (
            <div className="text-slate-400 pr-2 flex-shrink-0">
              <Search className="w-4 h-4" />
            </div>
          )}

          {/* Input de Búsqueda */}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => resultados.length > 0 && setMostrarDropdown(true)}
            placeholder={
              iaHabilitada
                ? 'Busca o describe lo que necesitas (Ej: algo para el desayuno)...'
                : 'Busca productos, abarrotes, bebidas...'
            }
            className="w-full py-2 px-1 bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none text-sm"
            autoComplete="off"
          />

          {/* Botones de Acción */}
          <div className="flex items-center gap-1.5 flex-shrink-0 pl-1">
            
            {isLoading && (
              <Loader2 className="w-4 h-4 text-violet-500 animate-spin mr-1" />
            )}

            {inputValue && (
              <button
                type="button"
                onClick={handleLimpiar}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full transition-colors"
                title="Limpiar"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Botón Lupa Profesional integrado */}
            <button
              type="button"
              onClick={() => {
                if (debounceRef.current) clearTimeout(debounceRef.current);
                realizarBusqueda(inputValue);
              }}
              className={`p-2 rounded-full text-white font-medium text-xs flex items-center justify-center transition-all cursor-pointer ${
                iaHabilitada
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-sm'
                  : 'bg-amber-500 hover:bg-amber-600 shadow-sm'
              }`}
              title="Buscar"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Botón "Armar Combo" (Aparece solo si los combos IA están activados independientemente) */}
            {mostrarCombos && iaCombosHabilitada && onAbrirCombos && (
              <button
                type="button"
                onClick={onAbrirCombos}
                className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-bold rounded-full transition-all shadow-sm flex-shrink-0 cursor-pointer"
                title="Crear combo con IA"
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
        <div className="absolute top-full mt-3 left-0 right-0 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 z-50 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <span>{resultados.length} resultado{resultados.length !== 1 ? 's' : ''}</span>
              {nivelUsado === 2 && (
                <span className="text-violet-600 dark:text-violet-400 font-bold bg-violet-50 dark:bg-violet-950/50 px-2 py-0.5 rounded-md text-[10px]">
                  ✨ Búsqueda Semántica RAG
                </span>
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
                <div className="w-11 h-11 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                  {producto.imagenUrl ? (
                    <Image
                      src={producto.imagenUrl}
                      alt={producto.nombre}
                      width={44}
                      height={44}
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
                  <span className="text-[10px] text-slate-400 group-hover:text-violet-500 flex items-center gap-0.5 transition-colors font-medium">
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
