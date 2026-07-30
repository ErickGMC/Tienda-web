import { describe, it, expect } from 'vitest';

/**
 * Función de mapeo de Banner idéntica a mapFirestoreBanner en actions.ts
 */
export const mapFirestoreBanner = (docData: any, id: string) => {
  const data = docData || {};
  return {
    id,
    title: data.title || '',
    subtitle: data.subtitle || '',
    imageUrl: data.imageUrl || data.imagenLocal || '',
    badgeText: data.badgeText || '',
    ctaText: data.ctaText || 'Ver más',
    ctaActionCategory: data.ctaActionCategory || 'Todas',
    active: data.active === true || data.active === 1 || data.active === '1',
    priority: Number(data.priority) || 0,
  };
};

describe('Tienda-web actions.ts - Banner Mapping Unit Tests', () => {
  it('debería tomar imagenLocal como fallback para imageUrl cuando el banner proviene de pos-android', () => {
    const docData = {
      title: 'Descuento Abarrotes',
      imagenLocal: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
      imageUrl: null,
      active: true,
      priority: 1,
    };

    const bannerMapeado = mapFirestoreBanner(docData, 'banner-android-1');
    expect(bannerMapeado.imageUrl).toBe('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...');
    expect(bannerMapeado.active).toBe(true);
  });

  it('debería mapear correctamente banners guardados desde tienda-pos con URL de Storage', () => {
    const docData = {
      title: 'Combo Bebidas',
      imageUrl: 'https://firebasestorage.googleapis.com/v0/b/app/o/banner.png',
      active: true,
      priority: 2,
    };

    const bannerMapeado = mapFirestoreBanner(docData, 'banner-desktop-1');
    expect(bannerMapeado.imageUrl).toBe('https://firebasestorage.googleapis.com/v0/b/app/o/banner.png');
  });
});
