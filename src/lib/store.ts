import { create } from 'zustand'
import { CategoriaProducto, Producto } from '../types/producto'
import { WebConfig, EmpresaConfig } from './actions'

interface TiendaState {
  searchQuery: string;
  selectedCategory: CategoriaProducto | 'Todas';
  consultaList: Producto[];
  showPrices: boolean;
  isInfoModalOpen: boolean;
  config: WebConfig | null;
  empresa: EmpresaConfig | null;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: CategoriaProducto | 'Todas') => void;
  addToConsulta: (producto: Producto) => void;
  removeFromConsulta: (id: string) => void;
  clearConsulta: () => void;
  setShowPrices: (show: boolean) => void;
  setInfoModalOpen: (isOpen: boolean) => void;
  setConfig: (config: WebConfig, empresa: EmpresaConfig) => void;
}

export const useTiendaStore = create<TiendaState>((set) => ({
  searchQuery: '',
  selectedCategory: 'Todas',
  consultaList: [],
  showPrices: false,
  isInfoModalOpen: false,
  config: null,
  empresa: null,
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
  setInfoModalOpen: (isOpen) => set({ isInfoModalOpen: isOpen }),
  setConfig: (config, empresa) => set({ config, empresa }),
}))

