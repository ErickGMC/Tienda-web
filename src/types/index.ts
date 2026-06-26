export interface ProductImage {
  url: string;
  alt: string;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  currency: string;
  images: ProductImage[];
  categoryId: string;
  tags: string[];
  metadata_vector: number[];
  view_count: number;
  stock: number;
  isFeatured: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  order: number;
}

export interface NewsOrOffer {
  id: string;
  type: 'banner' | 'news' | 'event';
  title: string;
  subtitle: string;
  imageUrl: string;
  callToActionUrl: string;
  isActive: boolean;
  priority: number;
  createdAt: Date | string;
}
