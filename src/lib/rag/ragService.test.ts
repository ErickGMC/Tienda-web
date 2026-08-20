import { describe, it, expect } from 'vitest';
import { 
  normalizarTexto, 
  singularizarToken, 
  evaluarTierOntologico, 
  busquedaSemanticaConDocs 
} from './ragService';
import { Producto } from '@/types/producto';

const mockProductos: Producto[] = [
  {
    id: 'prod-pollo',
    nombre: 'Pollo Fresco Entero',
    categoria: 'Abarrotes',
    descripcion: 'Carne de ave fresca proteína para cocina',
    precio: 9.8,
    disponible: true,
    etiquetas: ['pollo', 'carne', 'almuerzo']
  },
  {
    id: 'prod-huevo',
    nombre: 'Huevo de Gallina',
    categoria: 'Abarrotes',
    descripcion: 'Huevos frescos de gallina proteína alimento básico',
    precio: 6.8,
    disponible: true,
    etiquetas: ['huevo', 'huevos', 'desayuno']
  },
  {
    id: 'prod-queso',
    nombre: 'Queso Fresco',
    categoria: 'Abarrotes',
    descripcion: 'Queso fresco lácteo alimento para consumo diario',
    precio: 18.0,
    disponible: true,
    etiquetas: ['queso', 'lacteo']
  },
  {
    id: 'prod-leche',
    nombre: 'Leche Gloria Azul 390gr',
    categoria: 'Abarrotes',
    descripcion: 'Leche evaporada entera lácteo',
    precio: 2.6,
    disponible: true,
    etiquetas: ['leche', 'desayuno']
  },
  {
    id: 'prod-lenteja',
    nombre: 'Lenteja bebe',
    categoria: 'Abarrotes',
    descripcion: 'Legumbre seca menestra granos enteros',
    precio: 8.0,
    disponible: true,
    etiquetas: ['lenteja', 'menestra']
  },
  {
    id: 'prod-sporade',
    nombre: 'Sporade Bebida Rehidratante 500ml',
    categoria: 'Bebidas',
    descripcion: 'Bebida isotónica rehidratante con electrolitos para deporte',
    precio: 3.0,
    disponible: true,
    etiquetas: ['rehidratante', 'isotonica', 'sporade']
  },
  {
    id: 'prod-agua',
    nombre: 'Cielo Agua de Mesa 625ml',
    categoria: 'Bebidas',
    descripcion: 'Agua de mesa embotellada hidratación personal',
    precio: 1.2,
    disponible: true,
    etiquetas: ['agua', 'cielo', 'mineral']
  },
  {
    id: 'prod-yogurt',
    nombre: 'Gloria Yogurt Frutado 946g',
    categoria: 'Abarrotes',
    descripcion: 'Yogur bebible lácteo alimento para desayuno',
    precio: 7.0,
    disponible: true,
    etiquetas: ['yogurt', 'lacteo', 'bebible']
  },
  {
    id: 'prod-gaseosa',
    nombre: 'Inca Kola Gaseosa 500ml',
    categoria: 'Bebidas',
    descripcion: 'Bebida gaseosa refresco carbonatado',
    precio: 3.5,
    disponible: true,
    etiquetas: ['gaseosa', 'inca kola', 'refresco']
  },
  {
    id: 'prod-clorox',
    nombre: 'Clorox Lejía 319ml',
    categoria: 'Aseo y limpieza',
    descripcion: 'Lejía desinfectante blanqueador limpiador para ropa y superficies',
    precio: 2.0,
    disponible: true,
    etiquetas: ['lejia', 'limpieza', 'desinfectante']
  },
  {
    id: 'prod-arroz',
    nombre: 'Faraón Arroz Blanco Extra',
    categoria: 'Abarrotes',
    descripcion: 'Arroz blanco cereal grano entero alimento básico de cocina',
    precio: 4.8,
    disponible: true,
    etiquetas: ['arroz', 'almuerzo']
  },
  {
    id: 'prod-sublime',
    nombre: 'Nestlé Sublime Chocolate 37g',
    categoria: 'Golosinas',
    descripcion: 'Golosina snack dulce tableta de chocolate',
    precio: 3.2,
    disponible: true,
    etiquetas: ['chocolate', 'dulce', 'antojo']
  }
];

describe('Sistema RAG & Ontología de Necesidades (ragService)', () => {
  describe('Normalización y Corrección Tipográfica', () => {
    it('debe normalizar tildes y caracteres especiales', () => {
      expect(normalizarTexto('Proteína')).toBe('proteina');
      expect(normalizarTexto('Hidratación')).toBe('hidratacion');
      expect(normalizarTexto('Azúcar')).toBe('azucar');
      expect(normalizarTexto('Plátano')).toBe('platano');
    });

    it('debe comprimir vocales repetidas (errores de escritura)', () => {
      expect(normalizarTexto('hiidratacion')).toBe('hidratacion');
      expect(normalizarTexto('prooteina')).toBe('proteina');
      expect(normalizarTexto('pooollo')).toBe('pollo');
      expect(normalizarTexto('leeeche')).toBe('leche');
    });

    it('debe singularizar tokens en español correctamente', () => {
      expect(singularizarToken('proteinas')).toBe('proteina');
      expect(singularizarToken('huevos')).toBe('huevo');
      expect(singularizarToken('gaseosas')).toBe('gaseosa');
      expect(singularizarToken('carnes')).toBe('carne');
      expect(singularizarToken('limones')).toBe('limon');
      expect(singularizarToken('panes')).toBe('pan');
    });
  });

  describe('Ontología de Necesidades y Tiers (evaluarTierOntologico)', () => {
    it('debe asignar Tier 1 a carnes/huevos y Tier 2 a lácteos para la búsqueda "proteina"', () => {
      const tokens = ['proteina'];
      const query = 'proteina';

      const pollo = mockProductos.find(p => p.id === 'prod-pollo')!;
      const huevo = mockProductos.find(p => p.id === 'prod-huevo')!;
      const queso = mockProductos.find(p => p.id === 'prod-queso')!;
      const leche = mockProductos.find(p => p.id === 'prod-leche')!;
      const lenteja = mockProductos.find(p => p.id === 'prod-lenteja')!;
      const gaseosa = mockProductos.find(p => p.id === 'prod-gaseosa')!;

      expect(evaluarTierOntologico(pollo, query, tokens).tier).toBe(1);
      expect(evaluarTierOntologico(huevo, query, tokens).tier).toBe(1);
      expect(evaluarTierOntologico(queso, query, tokens).tier).toBe(2);
      expect(evaluarTierOntologico(leche, query, tokens).tier).toBe(2);
      expect(evaluarTierOntologico(lenteja, query, tokens).tier).toBe(3);
      expect(evaluarTierOntologico(gaseosa, query, tokens).tier).toBe(0);
    });

    it('debe asignar Tier 1 a isotónicas, Tier 2 a agua y Tier 4 a gaseosas para "hidratacion"', () => {
      const tokens = ['hidratacion'];
      const query = 'hidratacion';

      const sporade = mockProductos.find(p => p.id === 'prod-sporade')!;
      const agua = mockProductos.find(p => p.id === 'prod-agua')!;
      const yogurt = mockProductos.find(p => p.id === 'prod-yogurt')!;
      const gaseosa = mockProductos.find(p => p.id === 'prod-gaseosa')!;

      expect(evaluarTierOntologico(sporade, query, tokens).tier).toBe(1);
      expect(evaluarTierOntologico(agua, query, tokens).tier).toBe(2);
      expect(evaluarTierOntologico(yogurt, query, tokens).tier).toBe(3);
      expect(evaluarTierOntologico(gaseosa, query, tokens).tier).toBe(4);
    });

    it('debe responder igual ante error tipográfico "hiidratacion"', () => {
      const query = normalizarTexto('hiidratacion'); // 'hidratacion'
      const tokens = query.split(/\s+/);

      const sporade = mockProductos.find(p => p.id === 'prod-sporade')!;
      const agua = mockProductos.find(p => p.id === 'prod-agua')!;

      expect(evaluarTierOntologico(sporade, query, tokens).tier).toBe(1);
      expect(evaluarTierOntologico(agua, query, tokens).tier).toBe(2);
    });
  });

  describe('Ordenamiento Semántico Jerárquico (busquedaSemanticaConDocs)', () => {
    it('debe colocar las bebidas más hidratantes en primer lugar para la consulta "hidratacion"', () => {
      const mockDocs = mockProductos.map(p => ({ id: p.id, data: () => p }));
      const dummyEmbedding = new Array(768).fill(0.01);

      const resultados = busquedaSemanticaConDocs(dummyEmbedding, mockDocs, 6, 'hidratacion');

      expect(resultados.length).toBeGreaterThanOrEqual(2);
      // El primero debe ser Sporade (Tier 1)
      expect(resultados[0].id).toBe('prod-sporade');
      // El segundo debe ser Agua de Mesa Cielo (Tier 2)
      expect(resultados[1].id).toBe('prod-agua');
    });

    it('debe colocar carnes y huevos antes de lácteos y menestras para la consulta "proteina"', () => {
      const mockDocs = mockProductos.map(p => ({ id: p.id, data: () => p }));
      const dummyEmbedding = new Array(768).fill(0.01);

      const resultados = busquedaSemanticaConDocs(dummyEmbedding, mockDocs, 6, 'proteina');

      expect(resultados.length).toBeGreaterThanOrEqual(4);
      const topIds = resultados.map(r => r.id);
      
      // Pollo o Huevo (Tier 1) deben estar en los primeros 2 lugares
      expect(['prod-pollo', 'prod-huevo']).toContain(topIds[0]);
      expect(['prod-pollo', 'prod-huevo']).toContain(topIds[1]);

      // Queso o Leche (Tier 2) deben estar después de Tier 1
      expect(['prod-queso', 'prod-leche']).toContain(topIds[2]);
    });

    it('debe priorizar Lejía para la consulta "limpieza"', () => {
      const mockDocs = mockProductos.map(p => ({ id: p.id, data: () => p }));
      const dummyEmbedding = new Array(768).fill(0.01);

      const resultados = busquedaSemanticaConDocs(dummyEmbedding, mockDocs, 6, 'limpieza');

      expect(resultados[0].id).toBe('prod-clorox');
    });

    it('debe priorizar chocolates y galletas para la consulta "antojo dulce"', () => {
      const mockDocs = mockProductos.map(p => ({ id: p.id, data: () => p }));
      const dummyEmbedding = new Array(768).fill(0.01);

      const resultados = busquedaSemanticaConDocs(dummyEmbedding, mockDocs, 6, 'antojo dulce');

      expect(resultados.length).toBeGreaterThanOrEqual(1);
      expect(resultados[0].id).toBe('prod-sublime');
    });

    it('debe priorizar alimentos de desayuno para la consulta "desayuno"', () => {
      const mockDocs = mockProductos.map(p => ({ id: p.id, data: () => p }));
      const dummyEmbedding = new Array(768).fill(0.01);

      const resultados = busquedaSemanticaConDocs(dummyEmbedding, mockDocs, 6, 'desayuno');

      const topIds = resultados.slice(0, 3).map(r => r.id);
      // Huevo, Queso o Leche deben estar en el Top
      expect(topIds.some(id => ['prod-huevo', 'prod-queso', 'prod-leche'].includes(id))).toBe(true);
    });

    it('debe priorizar Arroz y Pollo para la consulta "almuerzo"', () => {
      const mockDocs = mockProductos.map(p => ({ id: p.id, data: () => p }));
      const dummyEmbedding = new Array(768).fill(0.01);

      const resultados = busquedaSemanticaConDocs(dummyEmbedding, mockDocs, 6, 'almuerzo criollo');

      const topIds = resultados.slice(0, 2).map(r => r.id);
      expect(topIds.some(id => ['prod-arroz', 'prod-pollo'].includes(id))).toBe(true);
    });
  });
});
