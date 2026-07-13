import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/ui/Navbar";
import { getComunidadConfig } from "@/lib/actions";
import { AvisoGlobal } from "@/components/ui/ComunidadSection";
import AnalyticsTracker from "@/components/ui/AnalyticsTracker";
import Footer from "@/components/ui/Footer";
import WhatsAppFAB from "@/components/ui/WhatsAppFAB";
import Toast from "@/components/ui/Toast";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });

export const metadata: Metadata = {
  title: "Minimarket Flor - Catálogo de Productos",
  description: "Encuentra los mejores abarrotes, verduras, frutas y más. Haz tu pedido por WhatsApp fácilmente.",
  keywords: ["minimarket", "abarrotes", "verduras", "frutas", "delivery", "bodega", "compras"],
  authors: [{ name: "Minimarket Flor" }],
  openGraph: {
    title: "Minimarket Flor",
    description: "Catálogo virtual de nuestro minimarket. Productos frescos y variados.",
    url: "https://minimarket-flor.com", // ACTUALIZAR CUANDO TENGAS DOMINIO
    siteName: "Minimarket Flor",
    locale: "es_PE",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Obtenemos la configuración de la comunidad para el aviso global
  const comunidad = await getComunidadConfig();

  // Datos estructurados para Google (LocalBusiness)
  // Esto ayuda MUCHO al SEO local
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "Minimarket Flor",
    "image": "https://minimarket-flor.com/logo.png", // ACTUALIZAR LUEGO
    "@id": "https://minimarket-flor.com", // ACTUALIZAR LUEGO
    "url": "https://minimarket-flor.com", // ACTUALIZAR LUEGO
    "telephone": "+51970560023",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Av. Principal 123", // SE ACTUALIZA DESDE FIREBASE IDEALMENTE PERO ESTO ES PARA GOOGLE
      "addressLocality": "Ciudad",
      "addressRegion": "Región",
      "postalCode": "00000",
      "addressCountry": "PE"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": -12.046374, // EJEMPLO
      "longitude": -77.042793 // EJEMPLO
    },
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday"
        ],
        "opens": "08:00",
        "closes": "22:00"
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
        <main className="flex-1 w-full relative">
          {children}
        </main>
        <Footer />
        <WhatsAppFAB />
        <Toast />
      </body>
    </html>
  );
}
