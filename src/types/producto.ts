export type CategoriaProducto = 
  | 'Abarrotes'
  | 'Bebidas'
  | 'Golosinas'
  | 'Verduras'
  | 'Frutas'
  | 'Aseo y limpieza'
  | 'Ferreteria y electricidad'
  | 'Bazar'
  | 'Medicina'
  | 'Libreria'
  | 'Ocasión y Otros'
  | 'Otros';

export interface Producto {
  id: string; // ID autogenerado por Firestore
  codigoBarras?: string;
  nombre: string;
  descripcion: string; // Importante para la integración con IA
  categoria: CategoriaProducto;
  precio: number;
  unidadMedida: 'unidad' | 'kg' | 'litro' | 'servicio' | 'variable';
  imagenUrl?: string;
  disponible: boolean;
  destacado: boolean; // Para mostrar en la pantalla principal o hero
  etiquetas?: string[]; // Ej: ["desayuno", "rapido", "caliente"]
  stock?: number;

  // ── Campos RAG / Búsqueda Semántica ──────────────────────────────────────
  /** Representación textual enriquecida para generar el vector de embedding.
   *  Construida automáticamente al guardar/editar el producto desde el POS.
   *  Ej: "Producto: Leche Gloria 1L. Categoría: Abarrotes. Descripción: ..."
   */
  texto_rag?: string;
  /** Vector de 768 dimensiones generado por text-embedding-004 de Gemini.
   *  Almacenado como VectorValue en Firestore para usar findNearest().
   *  En el cliente se expone como number[] tras la deserialización.
   */
  embedding?: number[];
}

