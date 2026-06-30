import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/ui/Navbar";
import InfoModal from "@/components/ui/InfoModal";
import AnalyticsTracker from "@/components/ui/AnalyticsTracker";
import { AvisoGlobal } from "@/components/ui/ComunidadSection";
import { getWebConfig, getEmpresaConfig, getComunidadConfig } from "@/lib/actions";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export async function generateMetadata(): Promise<Metadata> {
  const config = await getWebConfig();
  const empresa = await getEmpresaConfig();
  
  const nombre = empresa.nombreComercial || config.nombreTienda || "Minimarket Flor";
  const desc = config.descripcionTienda || "Encuentra abarrotes, frutas, verduras, servicios, y más cerca de ti. Precios justos y atención rápida por WhatsApp.";

  return {
    title: `${nombre} | Catálogo y Tienda`,
    description: desc,
    keywords: ["minimarket", "abarrotes", "tienda", nombre.toLowerCase(), "compras", "delivery whatsapp", "bodega"],
    authors: [{ name: nombre }],
    openGraph: {
      title: `${nombre} | Tu tienda de confianza`,
      description: desc,
      url: "https://minimarket-flor.com",
      siteName: nombre,
      locale: "es_PE",
      type: "website",
    },
    robots: {
      index: true,
      follow: true,
    }
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = await getWebConfig();
  const empresa = await getEmpresaConfig();
  const comunidad = await getComunidadConfig();
  
  const nombre = empresa.nombreComercial || config.nombreTienda || "Minimarket Flor";
  const desc = config.descripcionTienda || "Minimarket local ofreciendo abarrotes, limpieza, bazar y más.";
  const direccion = empresa.direccionFiscal || config.ubicacion || "Av. Principal 123";
  const telefono = empresa.telefono || config.whatsapp || "51970560023";

  // Datos estructurados (Schema.org) para que Google y las IA entiendan qué es tu negocio y dónde está
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: nombre,
    description: desc,
    image: 'https://minimarket-flor.com/logo.png', // idealmente config.logoUrl
    url: 'https://minimarket-flor.com',
    telephone: `+${telefono}`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: direccion,
      addressCountry: 'PE'
    },
    priceRange: 'S/',
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: [
          'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
        ],
        opens: '07:00',
        closes: '22:00'
      }
    ]
  };

  return (
    <html
      lang="es"
      className={`${inter.variable} font-sans h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
        <AnalyticsTracker />
        <AvisoGlobal comunidad={comunidad} />
        <Navbar />
        <InfoModal />
        <main className="flex-1 w-full relative">
          {children}
        </main>
      </body>
    </html>
  );
}
