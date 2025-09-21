# AutoApp · Simulador de test para el permiso B

Este MVP ofrece una experiencia completa para preparar el examen teórico del permiso B con una interfaz cuidada, login integrado y seguimiento del progreso en la nube mediante Firebase.

## Características destacadas

- **Inicio de sesión con Firebase Authentication.** Accede con usuario + contraseña (demo `user` / `user`) y guarda tu avance en la nube.
- **Historial sincronizado en Firestore.** Cada test finalizado se almacena por usuario mostrando en el listado si está aprobado (verde), pendiente (gris) o suspendido (rojo) junto con los aciertos obtenidos.
- **Dashboard atractivo y responsive.** Nueva interfaz con héroe informativo, tarjetas de permisos y estado en tiempo real del progreso del permiso B.
- **Test interactivo de 30 preguntas.** Navegación sencilla, seguimiento de aciertos provisionales y detalle completo de resultados con explicaciones.
- **Arquitectura preparada para crecer.** Packs de preguntas en JSON reutilizables y lógica desacoplada para incorporar nuevos permisos o extender a app móvil.

## Requisitos previos

- Node.js 18+ y npm instalados.
- Un proyecto de Firebase con Authentication (Email/Password) y Cloud Firestore habilitados.

## Configuración de Firebase

1. Crea un proyecto en la [consola de Firebase](https://console.firebase.google.com/).
2. Desde *Authentication* habilita el método **Email/Password**.
3. En *Firestore Database* crea una base de datos en modo producción o pruebas.
4. Obtén la configuración web del proyecto y reemplaza los valores del archivo [`firebase-config.js`](firebase-config.js).
5. Crea un usuario de prueba con email `user@autoapp.dev` (o simplemente nombre `user`, la app añade el dominio automáticamente) y contraseña `user`.
6. Opcional: ajusta las reglas de Firestore para restringir la lectura/escritura a usuarios autenticados.

> ⚠️ Si necesitas mantener las credenciales fuera del control de versiones, puedes crear un archivo `firebase-config.local.js` con tus claves y actualizar la importación en `app.js`.

## Puesta en marcha

```bash
npm install
npm run dev
```

El servidor de `lite-server` se iniciará (por defecto en `http://localhost:3000`). La app es estática, por lo que cualquier servidor similar funcionará.

## Flujo de uso

1. Inicia sesión con el usuario de prueba (`user` / `user`) o cualquier cuenta registrada en tu Firebase.
2. Pulsa en **Permiso B** para desplegar el listado de tests disponibles.
3. Escoge un pack: el botón te indicará si es tu primer intento, si lo aprobaste (verde) o si debes volver a intentarlo (rojo) junto con los aciertos del último intento.
4. Completa las 30 preguntas. El panel muestra progreso y aciertos provisionales.
5. Revisa el resumen final, guarda tu resultado en Firestore automáticamente y vuelve al listado para repetir o elegir otro test.

## Estructura del proyecto

```
├── index.html            # Maquetación principal y secciones (login, dashboard, test, resultados)
├── styles.css            # Sistema de estilos moderno y responsive
├── app.js                # Lógica de autenticación, test y persistencia en Firestore
├── firebase-config.js    # Configuración de Firebase (rellenar con tus credenciales)
└── data/
    └── pack1.json        # Pack de 30 preguntas para el permiso B
```

## Añadir nuevos packs

1. Duplica `data/pack1.json` y crea tu set de preguntas (30 preguntas, 4 opciones y `correctOption`).
2. Añade la nueva entrada al array `PACKS` de `app.js` indicando `id`, `title`, `description`, `file` y metadatos opcionales.
3. El historial de Firestore almacenará automáticamente los resultados por `packId`, por lo que no necesitas cambios adicionales en la base de datos.

## Próximos pasos sugeridos

- Implementar un selector real de múltiples permisos (A, C, D...) y sus respectivos packs.
- Añadir un sistema de analíticas por temáticas (señales, normativa, mecánica) con gráficas de rendimiento.
- Crear una app móvil reutilizando la lógica y los datos mediante un framework híbrido o nativo.
