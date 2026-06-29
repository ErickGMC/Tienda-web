'use client'

import SearchBar from './SearchBar'
import { Store, ListPlus, Info } from 'lucide-react'
import Link from 'next/link'
import { useTiendaStore } from '@/lib/store'

export default function Navbar() {
  const { consultaList, setInfoModalOpen } = useTiendaStore();

  const handleConsultarLista = () => {
    if (consultaList.length === 0) return;
    
    const savedWhatsapp = typeof window !== 'undefined' ? localStorage.getItem('tienda_whatsapp') : null;
    const numero = savedWhatsapp || "51970560023";
    let mensaje = "Hola, me interesa consultar el precio y disponibilidad de estos productos:%0A%0A";
    
    consultaList.forEach((p, index) => {
      mensaje += `${index + 1}. ${p.nombre}%0A`;
    });
    
    window.open(`https://wa.me/${numero}?text=${mensaje}`, '_blank');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-4">
        
        {/* Logo Section */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="p-2 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-xl text-white shadow-lg shadow-emerald-500/30 group-hover:shadow-emerald-500/50 transition-all duration-300">
            <Store className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 hidden sm:block">
            Minimarket Flor
          </span>
        </Link>

        {/* Search Bar Section */}
        <div className="flex-1 max-w-2xl min-w-0">
          <SearchBar />
        </div>

        {/* Right Section (WhatsApp Consult & Info) */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button 
            onClick={() => setInfoModalOpen(true)}
            className="p-2 rounded-full text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors"
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
  )
}
