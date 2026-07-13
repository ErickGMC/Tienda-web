import { create } from 'zustand'
import { CategoriaProducto, Producto } from '../types/producto'
import { WebConfig, EmpresaConfig } from './actions'

interface TiendaState {
  searchQuery: string;
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
  selectedCategory: 'Todas',
  consultaList: [],
  showPrices: false,
  isCartModalOpen: false,
  config: null,
  empresa: null,
  toastMessage: '',
  isToastVisible: false,
  setSearchQuery: (query) => set({ searchQuery: query }),
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
