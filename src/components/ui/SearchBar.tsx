'use client'

import { Search, Sparkles } from 'lucide-react'
import { useTiendaStore } from '@/lib/store'

export default function SearchBar() {
  const { searchQuery, setSearchQuery } = useTiendaStore()

  return (
    <div className="relative group w-full max-w-xl mx-auto">
      {/* Glow Effect */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
      
      <div className="relative flex items-center w-full bg-white dark:bg-slate-900 rounded-full shadow-sm">
        <div className="pl-4 pr-2 text-slate-400">
          <Search className="w-5 h-5" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Busca productos, abarrotes, servicios..."
          className="w-full py-3 px-2 bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none rounded-full"
        />
        <div className="pr-4 pl-2">
          {/* AI Sparkle Icon - To indicate future AI search capability */}
          <Sparkles className="w-5 h-5 text-emerald-500 animate-pulse" />
        </div>
      </div>
    </div>
  )
}
