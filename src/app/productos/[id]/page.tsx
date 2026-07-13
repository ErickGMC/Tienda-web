import Image from "next/image";
import { notFound } from "next/navigation";
import { getProductoById, getWebConfig, getEmpresaConfig } from "@/lib/actions";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const resolvedParams = await params;
  const product = await getProductoById(resolvedParams.id);
  if (!product) return { title: 'Producto no encontrado' };

  return {
    title: `${product.nombre} | Minimarket Flor`,
    description: product.descripcion?.slice(0, 160) || '',
    openGraph: {
      images: [product.imagenUrl],
    }
  };
}

export default async function ProductPage({ params }: Props) {
  const resolvedParams = await params;
  const product = await getProductoById(resolvedParams.id);

  if (!product) {
    notFound();
  }

  const config = await getWebConfig();
  const empresa = await getEmpresaConfig();
  const numeroContacto = config?.whatsapp || empresa?.telefono || "51970560023";

  // Schema.org para SEO de producto
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.nombre,
    "image": product.imagenUrl ? [product.imagenUrl] : [],
    "description": product.descripcion,
    "offers": {
      "@type": "Offer",
      "priceCurrency": "PEN",
      "price": product.precio,
      "itemCondition": "https://schema.org/NewCondition",
      "availability": "https://schema.org/InStock",
    }
  };

  return (
    <main className="container mx-auto px-4 py-12 min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="relative aspect-square w-full rounded-3xl overflow-hidden bg-slate-100 dark:bg-slate-800 shadow-inner">
          {product.imagenUrl ? (
            <Image
              src={product.imagenUrl}
              alt={product.nombre}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <span className="text-white font-bold text-6xl uppercase">
                {product.nombre.substring(0, 2)}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col justify-center">
          <div className="flex gap-2 mb-4">
            <span className="text-xs font-semibold tracking-wide uppercase bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 px-3 py-1 rounded-full">
              {product.categoria}
            </span>
            {product.etiquetas?.map(tag => (
              <span key={tag} className="text-xs font-medium tracking-wide uppercase bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 px-3 py-1 rounded-full">
                {tag}
              </span>
            ))}
          </div>
          
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white leading-tight mb-4">
            {product.nombre}
          </h1>
          
          <p className="text-3xl text-amber-600 dark:text-amber-400 font-bold mb-6">
            S/ {product.precio.toFixed(2)} <span className="text-sm font-normal text-slate-500">/ {product.unidadMedida}</span>
          </p>
          
          {product.descripcion && (
            <div className="prose prose-slate dark:prose-invert max-w-none mb-8">
              <p>{product.descripcion}</p>
            </div>
          )}

          <div className="mt-auto">
            <a 
              href={`https://wa.me/${numeroContacto}?text=Hola,%20me%20interesa%20consultar%20por%20el%20producto:%20*${product.nombre}*`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full md:w-auto bg-[#25D366] hover:bg-[#1ebe5d] text-white text-lg font-semibold py-4 px-10 rounded-2xl shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-circle"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/><path d="M8 12h.01"/><path d="M12 12h.01"/><path d="M16 12h.01"/></svg>
              Consultar por WhatsApp
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
