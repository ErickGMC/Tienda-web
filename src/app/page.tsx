import { getProductosActivos, getBannersActivos, getWebConfig } from "@/lib/actions";
import TiendaCatalog from "@/components/productos/TiendaCatalog";

export default async function Home() {
  // Obtener datos del servidor con revalidación/cache de Next.js
  const productos = await getProductosActivos();
  const banners = await getBannersActivos();
  const config = await getWebConfig();

  return (
    <TiendaCatalog 
      productos={productos} 
      banners={banners} 
      config={config} 
    />
  );
}
