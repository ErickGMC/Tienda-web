# 🛒 Ecosistema Minimarket Flor - Tienda Web

¡Bienvenido al repositorio de la **Tienda Web (E-commerce)**!

Este proyecto es la cara pública orientada a los clientes del minimarket. Sin embargo, no funciona de manera aislada; es la **segunda mitad de un ecosistema completo**. Trabaja en perfecta sincronía con el [Sistema POS de Administración Local](https://github.com/ErickGMC/Sistema-POS-para-TIenda).

Ambos sistemas comparten la misma fuente de datos en la nube utilizando **Firebase**.

---

## 🏗️ Arquitectura del Sistema
- **Sistema POS (Otro repositorio):** Una aplicación de escritorio (Electron) usada por los administradores y cajeros en el local físico. Es la encargada de crear productos, controlar el stock y gestionar las ventas. Toda esta información se sube automáticamente a Firebase.
- **Tienda Web (Este repositorio):** Una aplicación web ultra-rápida (Next.js) que "escucha" y lee la base de datos de Firebase para mostrar el catálogo actualizado al instante a los clientes por internet.

Para que **ambos sistemas se comuniquen**, DEBEN estar conectados exactamente al mismo proyecto de Firebase.

---

## 🚀 Instalación y Configuración

Si has clonado este repositorio para montar tu propia tienda web, necesitas conectarlo a tu propio proyecto de Firebase para que sea completamente ajeno a los datos del autor original.

### 1. Requisitos previos
- Node.js (v18+)
- Haber configurado previamente el [Sistema POS](https://github.com/ErickGMC/Sistema-POS-para-TIenda) y tener un proyecto de [Firebase](https://firebase.google.com/) con Firestore habilitado.

### 2. Configurar Credenciales de Firebase (Variables de Entorno)
1. En la carpeta principal (raíz) de este proyecto, copia el archivo de ejemplo para crear tu propio archivo de configuración local:
   ```bash
   cp .env.example .env.local
   ```
2. Abre el archivo `.env.local` que acabas de crear. Verás un formato parecido a este:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY="TU_API_KEY"
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="tu-proyecto.firebaseapp.com"
   NEXT_PUBLIC_FIREBASE_PROJECT_ID="tu-proyecto"
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="tu-proyecto.firebasestorage.app"
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="123456789"
   NEXT_PUBLIC_FIREBASE_APP_ID="1:123456789:web:abcde"
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="G-123456"
   ```
3. **Reemplaza los valores de ejemplo** con las claves reales de tu proyecto de Firebase. *(Son exactamente los mismos valores JSON que pusiste en el Sistema POS, pero adaptados al formato de variables de entorno).*

> 🔒 **Privacidad:** El archivo `.env.local` está configurado para ser ignorado por Git (vía `.gitignore`), así que tus credenciales nunca se subirán accidentalmente a tu repositorio. ¡Tus datos están a salvo!

### 3. Iniciar el Servidor de Desarrollo

Instala las dependencias y corre el proyecto:

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver tu tienda en vivo. En cuanto agregues productos desde tu Sistema POS de escritorio, aparecerán mágicamente aquí.
