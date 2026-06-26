import { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*', // Permite a todos los bots (Google, Bing, ChatGPT, etc.)
      allow: '/',
      disallow: '/private/',
    },
    sitemap: 'https://minimarket-flor.com/sitemap.xml', // Asegúrate de actualizar este dominio
  }
}
