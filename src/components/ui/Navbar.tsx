'use client'

import SearchBar from './SearchBar'
import { Store, ListPlus, Info } from 'lucide-react'
import Link from 'next/link'
import { useTiendaStore } from '@/lib/store'
import CartModal from './CartModal'

export default function Navbar() {
  const { consultaList, setInfoModalOpen, setCartModalOpen, config, empresa, setSelectedCategory, setSearchQuery } = useTiendaStore();

  const handleConsultarLista = () => {
    if (consultaList.length === 0) {
      alert("Aún no has seleccionado ningún producto. Agrega productos a tu lista antes de continuar.");
      return;
    }
    
    // Abrir el modal de carrito en lugar de enviar directo
    setCartModalOpen(true);
  };

  const handleReset = () => {
    setSelectedCategory('Todas');
    setSearchQuery('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const nombreComercial = empresa?.nombreComercial || config?.nombreTienda || "Minimarket Flor";

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-4">
        
        {/* Logo Section & Navigation */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group" onClick={handleReset}>
            <div className="p-2 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-xl text-white shadow-lg shadow-emerald-500/30 group-hover:shadow-emerald-500/50 transition-all duration-300">
              <Store className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 hidden sm:block">
              {nombreComercial}
            </span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-4">
            <Link href="/" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-emerald-500 transition-colors" onClick={handleReset}>
              Catálogo
            </Link>
            <Link href="/nosotros" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-emerald-500 transition-colors">
              Nuestra Tienda
            </Link>
          </nav>
        </div>

        {/* Search Bar Section */}
        <div className="flex-1 max-w-2xl min-w-0">
          <SearchBar />
        </div>

        {/* Right Section (WhatsApp Consult & Info) */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button 
            onClick={() => setInfoModalOpen(true)}
            className="p-2 rounded-full text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors md:hidden"
            title="Información de la tienda"
          >
            <Info className="w-5 h-5" />
          </button>
          
          <button 
            onClick={handleConsultarLista}
            className="relative flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-full font-medium text-sm text-white bg-green-500 hover:bg-green-600 transition-colors shadow-sm shadow-green-500/20"
          >
            <ListPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Mi Lista</span>
            {consultaList.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow">
                {consultaList.length}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
    <CartModal />
    </>
  )
}
