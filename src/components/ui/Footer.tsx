'use client'

import Link from 'next/link'
import { Store, MapPin, Phone, Mail } from 'lucide-react'
import { useTiendaStore } from '@/lib/store'

export default function Footer() {
  const { config, empresa } = useTiendaStore()

  const nombreComercial = config?.nombreTienda || empresa?.nombreComercial || "Minimarket Flor"
  const direccion = config?.ubicacion || empresa?.direccionFiscal || "Av. Principal 123"
  const telefono = config?.whatsapp || empresa?.telefono || "51970560023"
  const email = config?.emailContacto || "contacto@minimarket.com"

  const telefonoFormateado = `+${telefono.slice(0, 2)} ${telefono.slice(2)}`

  return (
    <footer className="bg-slate-900 text-slate-300 py-12 mt-auto border-t border-slate-800">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          
          {/* Brand & Description */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2 group inline-flex">
              <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl text-white shadow-lg">
                <Store className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold text-white">
                {nombreComercial}
              </span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              Tu minimarket de confianza. Ofrecemos los mejores productos con atención personalizada para ti y tu familia.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold text-lg">Enlaces Rápidos</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-sm hover:text-amber-400 transition-colors">Catálogo de Productos</Link>
              </li>
              <li>
                <Link href="/nosotros" className="text-sm hover:text-amber-400 transition-colors">Nuestra Comunidad</Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold text-lg">Contacto</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm">
                <MapPin className="w-5 h-5 text-amber-500 shrink-0" />
                <span>{direccion}</span>
              </li>
              <li className="flex items-center gap-3 text-sm">
                <Phone className="w-5 h-5 text-[#25D366] shrink-0" />
                <a href={`https://wa.me/${telefono}`} target="_blank" rel="noopener noreferrer" className="hover:text-amber-400 transition-colors">
                  {telefonoFormateado}
                </a>
              </li>
              <li className="flex items-center gap-3 text-sm">
                <Mail className="w-5 h-5 text-amber-500 shrink-0" />
                <a href={`mailto:${email}`} className="hover:text-amber-400 transition-colors break-all">
                  {email}
                </a>
              </li>
            </ul>
          </div>

        </div>

        <div className="border-t border-slate-800 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} {nombreComercial}. Todos los derechos reservados.</p>
          <p>Desarrollado con ❤️ para la comunidad.</p>
        </div>
      </div>
    </footer>
  )
}
