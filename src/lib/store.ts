import { create } from 'zustand'
import { CategoriaProducto, Producto } from '../types/producto'

interface TiendaState {
  searchQuery: string;
  selectedCategory: CategoriaProducto | 'Todas';
  consultaList: Producto[];
  showPrices: boolean;
  isInfoModalOpen: boolean;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: CategoriaProducto | 'Todas') => void;
  addToConsulta: (producto: Producto) => void;
  removeFromConsulta: (id: string) => void;
  clearConsulta: () => void;
  setShowPrices: (show: boolean) => void;
  setInfoModalOpen: (isOpen: boolean) => void;
}

export const useTiendaStore = create<TiendaState>((set) => ({
  searchQuery: '',
  selectedCategory: 'Todas',
  consultaList: [],
  showPrices: false, // Oculto por defecto hasta que el POS lo active
  isInfoModalOpen: false,
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  addToConsulta: (producto) => set((state) => {
    // Evitar duplicados exactos, pero permitir múltiples del mismo no es ideal para consulta simple, 
    // asumiremos que solo se agrega a la lista una vez para consultar.
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
}))
