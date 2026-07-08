# Tienda Web (Cliente)

Esta es la tienda pública en línea (e-commerce) para el sistema POS Minimarket Flor. Está construida con **Next.js** y se sincroniza en tiempo real con una base de datos **Firebase Firestore**.

## 🚀 Instalación y Configuración

Si has clonado este repositorio, necesitas conectarlo a tu propio proyecto de Firebase para que los productos, banners y usuarios se guarden en tu propia cuenta.

### 1. Requisitos previos
- Node.js (v18+)
- Una cuenta de [Firebase](https://firebase.google.com/) con un proyecto creado.
- Firestore Database habilitada en Firebase.

### 2. Configurar Credenciales de Firebase
1. En la raíz del proyecto, copia el archivo de ejemplo de variables de entorno:
   ```bash
   cp .env.example .env.local
   ```
2. Abre el archivo `.env.local` y reemplaza los valores de ejemplo con las credenciales reales de tu proyecto web de Firebase (las puedes encontrar en la configuración de tu proyecto en la consola de Firebase).

Ejemplo de `.env.local`:
```env
NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSy..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="tu-proyecto.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="tu-proyecto"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="tu-proyecto.firebasestorage.app"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="123456789"
NEXT_PUBLIC_FIREBASE_APP_ID="1:123456789:web:abcde"
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="G-123456"
```

> **Aviso de seguridad:** Tus datos estarán aislados en tu propia base de datos. Asegúrate de configurar las **Reglas de Seguridad de Firestore** para proteger tus datos de accesos no autorizados.

### 3. Iniciar el servidor de desarrollo

Instala las dependencias y corre el proyecto:

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver el resultado.

## 📦 Sincronización con el Sistema POS
Este proyecto funciona en conjunto con la aplicación de escritorio (POS). Los productos que crees y administres en el sistema POS se reflejarán automáticamente en esta tienda web siempre y cuando ambos sistemas compartan las mismas credenciales de Firebase.
