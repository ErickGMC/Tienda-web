import { describe, it, expect } from 'vitest';
import {
  cosineSimilarity,
  extractEmbeddingArray,
  busquedaSemanticaConDocs,
} from './ragService';

describe('ragService - Unit Tests', () => {
  describe('cosineSimilarity', () => {
    it('debería retornar 1.0 para dos vectores idénticos', () => {
      const vecA = [1.0, 2.0, 3.0];
      const vecB = [1.0, 2.0, 3.0];
      expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(1.0, 5);
    });

    it('debería retornar 0 si los vectores son ortogonales', () => {
      const vecA = [1.0, 0.0];
      const vecB = [0.0, 1.0];
      expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(0.0, 5);
    });

    it('debería manejar vectores vacíos o nulos sin lanzar excepción', () => {
      expect(cosineSimilarity([], [1, 2])).toBe(0);
      expect(cosineSimilarity(null as any, [1, 2])).toBe(0);
    });
  });

  describe('extractEmbeddingArray', () => {
    it('debería extraer embeddings desde un array plano', () => {
      const arr = [0.1, 0.2, 0.3];
      expect(extractEmbeddingArray(arr)).toEqual([0.1, 0.2, 0.3]);
    });

    it('debería extraer embeddings desde un objeto con propiedad values', () => {
      const obj = { values: [0.5, 0.6, 0.7] };
      expect(extractEmbeddingArray(obj)).toEqual([0.5, 0.6, 0.7]);
    });

    it('debería retornar null para objeto nulo o inválido', () => {
      expect(extractEmbeddingArray(null)).toBeNull();
      expect(extractEmbeddingArray({})).toBeNull();
    });
  });

  describe('busquedaSemanticaConDocs', () => {
    it('debería ordenar los productos por similitud coseno descendente', () => {
      const queryVec = [1.0, 0.0, 0.0];
      const docs = [
        {
          id: 'prod-1',
          data: {
            nombre: 'Producto A',
            precio: 10,
            disponible: true,
            embedding: [0.1, 0.9, 0.0], // Similitud baja
          },
        },
        {
          id: 'prod-2',
          data: {
            nombre: 'Producto B',
            precio: 20,
            disponible: true,
            embedding: [0.95, 0.05, 0.0], // Similitud alta
          },
        },
      ];

      const resultados = busquedaSemanticaConDocs(queryVec, docs);
      expect(resultados.length).toBeGreaterThan(0);
      expect(resultados[0].id).toBe('prod-2'); // Producto B debe ser el primero
    });
  });
});
