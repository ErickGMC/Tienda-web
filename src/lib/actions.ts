import { unstable_cache } from 'next/cache';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase/config';
import { Product } from '@/types';

// Revalidar cada 3600 segundos (1 hora)
const REVALIDATE_TIME = 3600;

export const getFeaturedProducts = unstable_cache(
  async () => {
    try {
      const snapshot = await getDocs(collection(db, 'products'));
      if (snapshot.empty) return getMockProducts();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
    } catch (error) {
      console.error("Error fetching from Firebase, returning mock", error);
      return getMockProducts();
    }
  },
  ['featured-products'],
  { revalidate: REVALIDATE_TIME, tags: ['products'] }
);

export const getProductById = unstable_cache(
  async (id: string) => {
    try {
      const docRef = doc(db, 'products', id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
         return getMockProducts().find(p => p.id === id) || null;
      }
      return { id: docSnap.id, ...docSnap.data() } as Product;
    } catch(error) {
      console.error("Error fetching product, returning mock", error);
      return getMockProducts().find(p => p.id === id) || null;
    }
  },
  ['product-detail'], 
  { revalidate: REVALIDATE_TIME }
);

// Fallback data for demonstration without a populated Firebase database
function getMockProducts(): Product[] {
  return [
    {
      id: "prod-1",
      title: "Auriculares Inalámbricos Premium",
      slug: "auriculares-premium",
      description: "Experimenta el sonido de alta fidelidad con cancelación de ruido activa.",
      price: 199.99,
      currency: "USD",
      images: [{ url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80", alt: "Auriculares" }],
      categoryId: "audio",
      tags: ["audio", "inalambrico", "premium"],
      metadata_vector: [],
      view_count: 1500,
      stock: 45,
      isFeatured: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: "prod-2",
      title: "Reloj Inteligente Serie X",
      slug: "reloj-serie-x",
      description: "Tu compañero perfecto para fitness y notificaciones diarias.",
      price: 249.50,
      currency: "USD",
      images: [{ url: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&q=80", alt: "Reloj inteligente" }],
      categoryId: "wearables",
      tags: ["reloj", "fitness", "tecnologia"],
      metadata_vector: [],
      view_count: 3200,
      stock: 12,
      isFeatured: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];
}
