import { getProductosActivos, getBannersActivos, getWebConfig, getEmpresaConfig, getComunidadConfig } from "@/lib/actions";
import TiendaCatalog from "@/components/productos/TiendaCatalog";

export default async function Home() {
  // Obtener datos del servidor con revalidación/cache de Next.js
  const productos = await getProductosActivos();
  const banners = await getBannersActivos();
  const config = await getWebConfig();
  const empresa = await getEmpresaConfig();
  const comunidad = await getComunidadConfig();

  return (
    <>
      <TiendaCatalog 
        productos={productos} 
        banners={banners} 
        config={config} 
        empresa={empresa}
      />
    </>
  );
}

