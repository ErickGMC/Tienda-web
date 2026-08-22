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

export interface PresentacionVariante {
  id: string;
  codigoBarras?: string;
  nombre: string;
  etiqueta: string; // Ej: "295ml Vidrio", "500ml Pet", "3L Familiar"
  precio: number;
  stock: number;
  disponible: boolean;
  unidadMedida?: string;
}

export interface Producto {
  id: string; // ID autogenerado por Firestore
  codigoBarras?: string;
  nombre: string;
  descripcion: string; // Importante para la integración con IA
  categoria: CategoriaProducto;
  precio: number;
  precioMax?: number; // Si hay múltiples variantes con distintos precios
  unidadMedida: 'unidad' | 'kg' | 'litro' | 'servicio' | 'variable';
  imagenUrl?: string;
  disponible: boolean;
  destacado: boolean; // Para mostrar en la pantalla principal o hero
  etiquetas?: string[]; // Ej: ["desayuno", "rapido", "caliente"]
  stock?: number;

  // ── Catálogo Web y Familias de Productos ──
  esPrincipalWeb?: boolean;
  productoPadreId?: string;
  etiquetaVariante?: string;
  mostrarPrecioWeb?: boolean; // Control individual: false para ocultar precio en la web
  presentaciones?: PresentacionVariante[]; // Variantes agrupadas bajo esta familia

  // ── Campos RAG / Búsqueda Semántica ──
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
