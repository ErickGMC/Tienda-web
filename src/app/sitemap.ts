import { MetadataRoute } from 'next'
 
export default function sitemap(): MetadataRoute.Sitemap {
  // Cuando tengas la base de datos conectada, aquí podrías obtener los IDs de las categorías 
  // o productos destacados para que las IAs y Google indexen cada producto.
  // Por ahora, enviaremos la página principal.
  
  return [
    {
      url: 'https://minimarket-flor.com', // Dominio final
      lastModified: new Date(),
      changeFrequency: 'daily', // Le dice a Google/IAs que tu tienda cambia (precios/stock) cada día
      priority: 1,
    },
    {
      url: 'https://minimarket-flor.com/productos/servicios',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ]
}
