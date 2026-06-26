import Image from "next/image";
import { notFound } from "next/navigation";
import { getProductById } from "@/lib/actions";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const resolvedParams = await params;
  const product = await getProductById(resolvedParams.id);
  if (!product) return { title: 'Producto no encontrado' };

  return {
    title: `${product.title} | Mi Tienda`,
    description: product.description.slice(0, 160),
    openGraph: {
      images: [product.images[0]?.url],
    }
  };
}

export default async function ProductPage({ params }: Props) {
  const resolvedParams = await params;
  const product = await getProductById(resolvedParams.id);

  if (!product) {
    notFound();
  }

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.title,
    "image": product.images.map(img => img.url),
    "description": product.description,
    "offers": {
      "@type": "Offer",
      "priceCurrency": product.currency,
      "price": product.price,
      "itemCondition": "https://schema.org/NewCondition",
      "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
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
          <Image
            src={product.images[0]?.url || '/placeholder.png'}
            alt={product.images[0]?.alt || product.title}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>

        <div className="flex flex-col justify-center">
          <div className="flex gap-2 mb-4">
            {product.tags?.map(tag => (
              <span key={tag} className="text-xs font-medium tracking-wide uppercase bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-3 py-1 rounded-full">
                {tag}
              </span>
            ))}
          </div>
          
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white leading-tight mb-4">
            {product.title}
          </h1>
          
          <p className="text-3xl text-indigo-600 dark:text-indigo-400 font-bold mb-6">
            {product.currency} ${product.price.toFixed(2)}
          </p>
          
          <div className="prose prose-slate dark:prose-invert max-w-none mb-8">
            <p>{product.description}</p>
          </div>

          <div className="mt-auto">
            <button className="w-full md:w-auto bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white text-lg font-semibold py-4 px-10 rounded-2xl shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
              </svg>
              Añadir al Carrito
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
