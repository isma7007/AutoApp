# AutoApp · MVP Test Permiso B

Este repositorio contiene un MVP de una aplicación web para practicar tests de autoescuela del permiso B.

## Características principales

- Packs de preguntas almacenados en ficheros JSON (30 preguntas por pack).
- Interfaz amigable para completar el test con controles de navegación.
- Resumen de resultados y detalle pregunta a pregunta con explicaciones.
- Lógica preparada para añadir nuevos packs reutilizando la misma base.

## Estructura del proyecto

```
├── index.html          # Estructura principal de la SPA
├── styles.css          # Estilos base de la aplicación
├── app.js              # Lógica del test y gestión de estado
└── data/
    └── pack1.json      # Primer pack de 30 preguntas (Permiso B)
```

## Ejecutar en local

La aplicación está pensada como web estática. Para evitar problemas al cargar los JSON desde el sistema de ficheros, se recomienda servirla con un servidor estático sencillo.

1. Instala las dependencias (solo la primera vez):
   ```bash
   npm install
   ```
2. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```
3. Abre tu navegador en `http://localhost:5173` (o el puerto indicado en consola).

También puedes utilizar cualquier servidor estático (por ejemplo `npx serve` o la extensión de Live Server de VSCode).

## Añadir nuevos packs de preguntas

1. Crea un nuevo archivo dentro de `data/` siguiendo la estructura de `pack1.json`.
2. Añade el identificador del nuevo pack al array `PACKS` en `app.js`, indicando el nombre visible y la ruta del fichero JSON.
3. Cada pack debe incluir exactamente 30 preguntas con cuatro opciones y el índice de la respuesta correcta (`correctOption`).

## Próximos pasos sugeridos

- Persistir el progreso del usuario (localStorage) para revisar tests anteriores.
- Añadir soporte para seleccionar distintos permisos (A, C, etc.).
- Crear versión móvil reutilizando la capa de datos y lógica ya existente.
