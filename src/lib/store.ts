import { create } from 'zustand'
import { CategoriaProducto, Producto } from '../types/producto'
import { WebConfig, EmpresaConfig } from './actions'

interface TiendaState {
  searchQuery: string;
  activeSearchTerm: string;
  ragProductos: Producto[] | null;
  searchNivel: 1 | 2 | null;
  searchLatencyMs: number | null;
  isSearching: boolean;
  selectedCategory: CategoriaProducto | 'Todas';
  consultaList: Producto[];
  showPrices: boolean;
  config: WebConfig | null;
  empresa: EmpresaConfig | null;
  isCartModalOpen: boolean;
  // Toast
  toastMessage: string;
  isToastVisible: boolean;
  setSearchQuery: (query: string) => void;
  setSearchInfo: (info: { term: string; productos: Producto[] | null; nivel?: 1 | 2 | null; latencyMs?: number | null }) => void;
  setIsSearching: (isSearching: boolean) => void;
  clearSearch: () => void;
  setRagProductos: (prods: Producto[] | null) => void;
  setSelectedCategory: (category: CategoriaProducto | 'Todas') => void;
  addToConsulta: (producto: Producto) => void;
  removeFromConsulta: (id: string) => void;
  clearConsulta: () => void;
  setShowPrices: (show: boolean) => void;
  setCartModalOpen: (isOpen: boolean) => void;
  setConfig: (config: WebConfig, empresa: EmpresaConfig) => void;
  showToast: (message: string) => void;
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;

export const useTiendaStore = create<TiendaState>((set) => ({
  searchQuery: '',
  activeSearchTerm: '',
  ragProductos: null,
  searchNivel: null,
  searchLatencyMs: null,
  isSearching: false,
  selectedCategory: 'Todas',
  consultaList: [],
  showPrices: false,
  isCartModalOpen: false,
  config: null,
  empresa: null,
  toastMessage: '',
  isToastVisible: false,
  setSearchQuery: (query) => set((state) => ({
    searchQuery: query,
    // Si se limpia el input completamente, limpiar también la búsqueda activa
    activeSearchTerm: query.trim() === '' ? '' : state.activeSearchTerm,
    ragProductos: query.trim() === '' ? null : state.ragProductos,
    searchNivel: query.trim() === '' ? null : state.searchNivel,
    searchLatencyMs: query.trim() === '' ? null : state.searchLatencyMs,
  })),
  setSearchInfo: ({ term, productos, nivel = null, latencyMs = null }) => set({
    activeSearchTerm: term,
    searchQuery: term,
    ragProductos: productos,
    searchNivel: nivel,
    searchLatencyMs: latencyMs,
    isSearching: false
  }),
  setIsSearching: (isSearching) => set({ isSearching }),
  clearSearch: () => set({
    searchQuery: '',
    activeSearchTerm: '',
    ragProductos: null,
    searchNivel: null,
    searchLatencyMs: null,
    isSearching: false
  }),
  setRagProductos: (prods) => set({ ragProductos: prods }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  addToConsulta: (producto) => set((state) => {
    if (!state.consultaList.find(p => p.id === producto.id)) {
      return { consultaList: [...state.consultaList, producto] }
    }
    return state;
  }),
  removeFromConsulta: (id) => set((state) => ({
    consultaList: state.consultaList.filter(p => p.id !== id)
  })),
  clearConsulta: () => set({ consultaList: [] }),
  setShowPrices: (show) => set({ showPrices: show }),
  setCartModalOpen: (isOpen) => set({ isCartModalOpen: isOpen }),
  setConfig: (config, empresa) => set({ config, empresa }),
  showToast: (message) => {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toastMessage: message, isToastVisible: true });
    toastTimer = setTimeout(() => {
      set({ isToastVisible: false });
    }, 2500);
  },
}))
