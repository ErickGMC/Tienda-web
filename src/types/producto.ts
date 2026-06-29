export type CategoriaProducto = 
  | 'Abarrotes' 
  | 'Limpieza' 
  | 'Frutas y Verduras' 
  | 'Bazar' 
  | 'Medicina' 
  | 'Ferretería y Electricidad'
  | 'Golosinas y Bebidas'
  | 'Servicios' 
  | 'Otros';

export interface Producto {
  id: string; // ID autogenerado por Firestore
  codigoBarras?: string;
  nombre: string;
  descripcion: string; // Importante para futura integración con IA
  categoria: CategoriaProducto;
  precio: number;
  unidadMedida: 'unidad' | 'kg' | 'litro' | 'servicio' | 'variable';
  imagenUrl?: string;
  disponible: boolean;
  destacado: boolean; // Para mostrar en la pantalla principal o hero
  etiquetas: string[]; // Ej: ["desayuno", "rapido", "caliente"]
  stock?: number;
  // futuro_campo_ia: vector[] (Para búsqueda semántica con embeddings)
}
