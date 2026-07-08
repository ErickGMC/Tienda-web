import { getWebConfig, getEmpresaConfig, getBannersActivos } from "@/lib/actions";
import { MapPin, Phone, Mail, Clock, ShieldCheck, Store } from "lucide-react";
import Image from "next/image";

export async function generateMetadata() {
  const config = await getWebConfig();
  const empresa = await getEmpresaConfig();
  const nombre = empresa.nombreComercial || config.nombreTienda || "Minimarket Flor";
  return {
    title: `Nuestra Tienda | ${nombre}`,
    description: config.descripcionTienda || `Conoce más sobre ${nombre}. Ubicación, horarios de atención, contacto directo y mapa interactivo.`,
  };
}

export default async function NosotrosPage() {
  const config = await getWebConfig();
  const empresa = await getEmpresaConfig();
  const banners = await getBannersActivos();

  const nombre = empresa.nombreComercial || config.nombreTienda || "Minimarket Flor";
  const descripcion = config.descripcionTienda || "Tu tienda de confianza con los mejores productos para tu hogar.";
  const horario = config.horarioAtencion || "Lunes a Sábado: 8:00 AM - 10:00 PM\nDomingo: 9:00 AM - 6:00 PM";
  const ubicacion = empresa.direccionFiscal || config.ubicacion || "Av. Principal 123, Ciudad";
  const whatsapp = empresa.telefono || config.whatsapp || "51970560023";
  const email = config.emailContacto || "contacto@minimarketflor.com";
  const mapaUrl = config.mapaIframe || "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3901.865912448375!2d-77.04537!3d-12.04637!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTLCsDAyJzQ2LjkiUyA3N8KwMDInNDMuMyJX!5e0!3m2!1ses!2spe!4v1650000000000!5m2!1ses!2spe";

  const formatearWhatsapp = (num: string) => {
    return `+${num.slice(0, 2)} ${num.slice(2)}`;
  };

  const bannerNosotros = banners.find(b => b.ctaActionCategory === 'Nosotros');

  return (
    <main className="container mx-auto px-4 py-12 max-w-7xl">
      
      {/* Hero Section */}
      {bannerNosotros ? (
        <div className="relative rounded-3xl overflow-hidden mb-12 shadow-2xl aspect-[4/1] min-h-[150px] w-full">
          <Image 
            src={bannerNosotros.imageUrl} 
            alt={bannerNosotros.title || "Nuestra Tienda"} 
            fill 
            sizes="100vw"
            unoptimized={true}
            className="object-cover" 
          />
        </div>
      ) : (
        <div className="relative rounded-3xl overflow-hidden mb-12 bg-gradient-to-r from-emerald-800 to-slate-900 text-white p-8 md:p-16 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white backdrop-blur-md text-xs font-semibold mb-4 border border-white/20">
              <Store className="w-4 h-4 text-emerald-400" />
              Nuestra Tienda
            </span>
            <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tight drop-shadow">{nombre}</h1>
            <p className="text-lg text-slate-200 leading-relaxed font-medium drop-shadow">{descripcion}</p>
          </div>
          <div className="w-24 h-24 md:w-32 md:h-32 bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl flex items-center justify-center text-emerald-400 shrink-0">
            <Store className="w-12 h-12 md:w-16 md:h-16" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Info Column (Left) */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Tarjeta Ubicación */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition duration-300">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-1">Dirección</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{ubicacion}</p>
              </div>
            </div>
          </div>

          {/* Tarjeta Horarios */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition duration-300">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-1">Horario de Atención</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed whitespace-pre-line">{horario}</p>
              </div>
            </div>
          </div>

          {/* Tarjeta Contacto */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition duration-300 space-y-6">
            <h3 className="font-bold text-slate-800 dark:text-white text-lg border-b border-slate-100 dark:border-slate-800 pb-2">Canales de Atención</h3>
            
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 rounded-xl">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">WhatsApp</p>
                <a 
                  href={`https://wa.me/${whatsapp}?text=Hola,%20quisiera%20hacer%20una%20consulta`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="font-bold text-slate-700 dark:text-slate-300 hover:text-green-500 transition text-sm"
                >
                  {formatearWhatsapp(whatsapp)}
                </a>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Correo Electrónico</p>
                <a 
                  href={`mailto:${email}`} 
                  className="font-bold text-slate-700 dark:text-slate-300 hover:text-blue-500 transition text-sm break-all"
                >
                  {email}
                </a>
              </div>
            </div>
          </div>

          {/* Tarjeta Compromiso */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-900/50 dark:to-slate-900/30 rounded-3xl border border-emerald-100 dark:border-slate-800/80 p-6 space-y-4">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold">
              <ShieldCheck className="w-5 h-5" />
              <span>Garantía de Frescura</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              Nos preocupamos por tu bienestar. Todos nuestros perecibles son seleccionados cuidadosamente a diario para garantizar la mejor calidad en tu mesa.
            </p>
          </div>

        </div>

        {/* Map Column (Right) */}
        <div className="lg:col-span-2 flex flex-col">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm flex-1 flex flex-col p-6">
            <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-4 flex items-center gap-2">
              <MapPin className="text-emerald-500 w-5 h-5" />
              Ubicación en el Mapa
            </h3>
            
            <div className="relative rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex-1 min-h-[350px] border border-slate-100 dark:border-slate-800">
              {config.mapaIframe?.includes('<iframe') ? (
                <div 
                  className="absolute inset-0 w-full h-full [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:border-0"
                  dangerouslySetInnerHTML={{ __html: config.mapaIframe }} 
                />
              ) : (
                <iframe
                  src={mapaUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0, minHeight: "350px" }}
                  allowFullScreen={true}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="absolute inset-0 w-full h-full"
                ></iframe>
              )}
            </div>

            <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-850">
              <span className="text-xs text-slate-500 font-medium text-center sm:text-left">¿Quieres hacer un pedido a domicilio? Hazlo directamente a nuestro WhatsApp.</span>
              <a 
                href={`https://wa.me/${whatsapp}?text=Hola,%20quisiera%20hacer%20un%20pedido`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-full text-xs font-bold transition shadow-sm"
              >
                Hacer Pedido
              </a>
            </div>
          </div>
        </div>

      </div>

    </main>
  );
}
