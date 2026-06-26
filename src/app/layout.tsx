import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/ui/Navbar";
import InfoModal from "@/components/ui/InfoModal";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Minimarket Flor | Catálogo y Tienda",
  description: "Minimarket Flor: Encuentra abarrotes, frutas, verduras, servicios, y más cerca de ti. Precios justos y atención rápida por WhatsApp.",
  keywords: ["minimarket cerca de mi", "abarrotes", "tienda", "minimarket flor", "compras", "delivery whatsapp", "frutas y verduras", "bodega"],
  authors: [{ name: "Minimarket Flor" }],
  openGraph: {
    title: "Minimarket Flor | Tu tienda de confianza",
    description: "Todo lo que necesitas, desde abarrotes frescos hasta servicios rápidos.",
    url: "https://minimarket-flor.com", // Cambiar por el dominio final
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
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Datos estructurados (Schema.org) para que Google y las IA entiendan qué es tu negocio y dónde está
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'Minimarket Flor',
    description: 'Minimarket local ofreciendo abarrotes, limpieza, bazar, menú del día, recargas y más.',
    image: 'https://minimarket-flor.com/logo.png', // Cambiar por tu logo
    url: 'https://minimarket-flor.com',
    telephone: '+51970560023',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Av. Principal 123', // TODO: Reemplazar con real
      addressLocality: 'Tu Ciudad', // TODO: Reemplazar
      addressRegion: 'Tu Región', // TODO: Reemplazar
      addressCountry: 'PE' // PE = Perú
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: -12.046374, // TODO: Reemplazar con tus coordenadas de Google Maps
      longitude: -77.042793 // TODO: Reemplazar con tus coordenadas
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
    ],
    sameAs: [
      // Enlaces a tus redes sociales si las tienes
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
        <Navbar />
        <InfoModal />
        <main className="flex-1 w-full relative">
          {children}
        </main>
      </body>
    </html>
  );
}
