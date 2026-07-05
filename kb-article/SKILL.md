---
name: em-kb-article
description: Use when creating knowledge base articles for Easymailing. Also use when user says "crear artículo", "documentar", "base de conocimiento", "help center", "zendesk article", or similar documentation requests.
---

# Knowledge Base Article para Easymailing

Crea artículos de base de conocimiento para Easymailing, consultando código, navegando la app cuando sea necesario, y publicando como borrador en Zendesk.

## Configuración requerida

### Archivo de configuración

Verifica que existe `.kb-config.json` en la carpeta de esta skill. Si no existe, pregunta:

1. "¿Cuál es la ruta del proyecto Easymailing?"
2. "¿Cuál es la ruta del vault de Obsidian?"
3. "¿Cuál es tu email de Zendesk?"

Crea el archivo con esta estructura:

```json
{
  "project_path": "{ruta al proyecto}",
  "obsidian_vault_path": "{ruta al vault}",
  "zendesk_subdomain": "easymailing",
  "zendesk_email": "{email del usuario}",
  "test_app": {
    "url": "http://dfutura.easymailing.test",
    "user": "jhon@acme.com"
  }
}
```

Y recuerda al usuario:

```
Configuración guardada en .kb-config.json

Recuerda configurar las variables de entorno:
- ZENDESK_API_TOKEN: tu token de API de Zendesk
- EASYMAILING_TEST_PASSWORD: password del usuario de test
```

### Variables de entorno

El archivo `.env` en la carpeta de la skill debe contener:
```
ZENDESK_API_TOKEN=tu_token_de_zendesk
EASYMAILING_TEST_PASSWORD=password_del_usuario_test
```

## Script de Zendesk

La skill incluye un script CLI para interactuar con la API de Zendesk:

```bash
# Listar categorías
npx bun kb-article/scripts/zendesk.ts categories

# Listar secciones de una categoría
npx bun kb-article/scripts/zendesk.ts sections <category_id>

# Buscar artículos
npx bun kb-article/scripts/zendesk.ts search "término de búsqueda"

# Obtener un artículo (para análisis de estilo)
npx bun kb-article/scripts/zendesk.ts article <article_id>

# Obtener traducciones de un artículo
npx bun kb-article/scripts/zendesk.ts translations <article_id>

# Guardar backup antes de modificar un artículo publicado
npx bun kb-article/scripts/zendesk.ts backup <article_id> --out "{project_path}/docs/kb-workspace/v1.27/backups"

# Crear artículo como borrador
npx bun kb-article/scripts/zendesk.ts create <section_id> --title "Título" --body "<html>" --locale es --draft

# Añadir traducción
npx bun kb-article/scripts/zendesk.ts translate <article_id> --title "Title" --body "<html>" --locale en
```

El script lee automáticamente `.kb-config.json` y `.env` de la carpeta de la skill.

## Flujo principal

```
FASE 1: Contexto inicial
   ↓
FASE 2: Investigación
   ↓
FASE 3: Preguntas interactivas
   ↓
FASE 4: Propuesta de estructura
   ↓
FASE 5: Generación (ES → EN)
   ↓
FASE 6: Publicación
```

## Fase 1: Contexto inicial

### Paso 1.1: Preguntar origen

Pregunta usando AskUserQuestion:

```
¿De dónde surge este artículo?

A) Ticket/pregunta de soporte - Usuarios preguntan frecuentemente sobre esto
B) Feature nueva - Hay que documentar una funcionalidad recién lanzada
C) Documentación faltante - Detecté que falta explicar esto
```

### Paso 1.2: Preguntar tema

Pregunta abierta:

> "¿Sobre qué funcionalidad o tema quieres crear el artículo?"

### Paso 1.3: Consultar Zendesk

Usa el script de Zendesk para obtener contexto:

1. **Listar categorías y secciones**:
   ```bash
   npx bun kb-article/scripts/zendesk.ts categories
   npx bun kb-article/scripts/zendesk.ts sections <category_id>
   ```
   Presenta las opciones al usuario para elegir dónde ubicar el artículo.

2. **Buscar artículos relacionados**:
   ```bash
   npx bun kb-article/scripts/zendesk.ts search "{tema}"
   ```
   Si encuentra artículos similares:
   - Informa al usuario para evitar duplicados
   - Sugiere posibles enlaces cruzados

3. **Leer 2-3 artículos existentes** (para análisis de estilo):
   ```bash
   npx bun kb-article/scripts/zendesk.ts article <article_id>
   ```
   Analiza el estilo y formato para mantener consistencia.

4. **Backup obligatorio antes de modificar artículos publicados**:
   Si el artículo ya existe en Zendesk y se va a modificar, descarga un backup antes de redactar o actualizar contenido:
   ```bash
   npx bun kb-article/scripts/zendesk.ts backup <article_id> --out "{project_path}/docs/kb-workspace/v1.27/backups"
   ```
   Registra en el Evidence Pack las rutas del JSON y Markdown generados. No actualizar Zendesk si no existe backup.

## Fase 2: Investigación

### Paso 2.1: Revisar código

Según el tema, busca en el proyecto Easymailing:
- Controllers y vistas relacionadas
- Modelos y lógica de negocio
- Documentación existente en docs/

Determina la profundidad necesaria:
- Solo UI → revisar vistas y JS
- Flujo completo → añadir controllers
- Lógica compleja → incluir modelos y servicios

### Paso 2.2: Navegar la app (si necesario)

Si crees que necesitas ver la UI para entender mejor, pregunta:

> "Para entender mejor [X], ¿quieres que navegue la app y explore [pantalla/flujo específico]?"

Si el usuario confirma:

1. Usa Chrome para abrir `{test_app.url}` de la config
2. Haz login:
   - Usuario: `{test_app.user}` de la config
   - Password: valor de `EASYMAILING_TEST_PASSWORD`
3. Navega a la sección relevante
4. Explora la funcionalidad (solo lectura, no modificar datos)
5. Reporta lo observado

### Paso 2.3: Presentar hallazgos

Resume lo encontrado:
- Qué hace la funcionalidad
- Cómo se accede
- Flujo principal
- Casos especiales detectados

## Fase 3: Preguntas interactivas

Haz preguntas UNA A UNA para clarificar el artículo:

1. "¿Qué nivel de usuario es el target? (principiante, intermedio, avanzado)"
2. "¿Cuál es el problema principal que el usuario intenta resolver?"
3. "¿Hay pasos previos que el usuario debe conocer antes?"
4. "¿Qué errores comunes cometen los usuarios con esto?"
5. "¿Hay limitaciones o casos especiales que debamos mencionar?"

Adapta las preguntas según el contexto. No todas son necesarias en todos los casos.

## Fase 4: Propuesta de estructura

Presenta un outline con títulos y bullets:

```markdown
## Estructura propuesta

### 1. Introducción
- Qué es [funcionalidad]
- Para qué sirve

### 2. Cómo acceder
- Ruta de navegación
- Permisos necesarios

### 3. [Sección principal según el tema]
- Punto clave 1
- Punto clave 2
- Punto clave 3

### 4. Casos de uso
- Ejemplo práctico

### 5. Preguntas frecuentes (si aplica)
- Pregunta común 1
- Pregunta común 2
```

Pregunta: "¿Esta estructura te parece bien o ajustamos algo?"

Itera hasta que el usuario apruebe.

## Fase 5: Redacción y revisión

### Paso 5.1: Redactar artículo en español (Markdown)

Genera el artículo completo en **Markdown** para que el usuario pueda revisarlo fácilmente.

Usa el formato estándar de Markdown:
- `#`, `##`, `###` para títulos
- `**texto**` para negritas
- `-` o `*` para listas
- `1.`, `2.`, `3.` para pasos numerados
- `> texto` para notas o tips importantes
- `[IMAGEN: descripción]` para placeholders de imágenes

Muestra el Markdown y pregunta: "¿El artículo en español está bien o ajustamos algo?"

Itera con el usuario hasta que apruebe el contenido.

### Paso 5.2: Redactar artículo en inglés (Markdown)

Una vez aprobado el español, genera la versión en inglés en Markdown.

Muestra el Markdown y pregunta: "¿La versión en inglés está bien?"

Itera hasta que el usuario apruebe.

### Paso 5.3: Generar HTML final

Una vez aprobados ambos idiomas, convierte el Markdown a HTML usando los componentes de Zendesk:

**Alertas** (información importante):
```html
<div class="alert alert-info">
  Texto informativo o tip
</div>

<div class="alert alert-warning">
  Advertencia o precaución
</div>
```

**Pasos numerados**:
```html
<p>
  <span class="number">1</span> Descripción del paso
</p>
<p>
  <span class="number">2</span> Siguiente paso
</p>
```

**Índice de contenidos** (artículos largos):
```html
<div class="content-index">
  <p>Índice de contenidos</p>
  <p><a href="#seccion1">1. Primera sección</a></p>
  <p><a href="#seccion2">2. Segunda sección</a></p>
</div>

<h2 id="seccion1">Primera sección</h2>
```

**Tablas**:
```html
<table>
  <tbody>
    <tr>
      <td class="gray"><strong>Destacado</strong></td>
      <td>Contenido normal</td>
    </tr>
  </tbody>
</table>
```

**Placeholders de imágenes**:
```html
<p>(IMAGEN PENDIENTE: Descripción detallada de qué mostrar)</p>
```

El HTML se genera automáticamente sin mostrar al usuario (ya aprobó el contenido en Markdown).

## Fase 6: Publicación

### Paso 6.1: Guardar en Obsidian

Crea la carpeta y archivos:

```
{obsidian_vault_path}/Areas/Easymailing/Knowledge-Base/{YYYY-MM-DD}-{slug}/
├── article-brief.md
├── article-es.md
├── article-en.md
└── images.md
```

**article-brief.md**:
```markdown
# {Título del artículo}

## Metadata
- Fecha: {YYYY-MM-DD}
- Categoría Zendesk: {categoría elegida}
- Sección Zendesk: {sección elegida}
- Origen: {soporte/feature nueva/faltaba documentación}

## Resumen
{Breve descripción de qué explica el artículo}

## Artículos relacionados
- {links a artículos existentes si los hay}

## Zendesk
- Borrador ES: {URL después de publicar}
- Borrador EN: {URL después de publicar}
```

**article-es.md** (HTML en bloque de código):
```markdown
# {Título en español}

## HTML

\`\`\`html
{HTML del artículo en español}
\`\`\`
```

**article-en.md** (HTML en bloque de código):
```markdown
# {Título en inglés}

## HTML

\`\`\`html
{HTML del artículo en inglés}
\`\`\`
```

**images.md**:
```markdown
# Imágenes requeridas

## 1. {nombre-descriptivo}.png
- **Ubicación en HTML:** Sección "{nombre}"
- **Qué mostrar:** {descripción detallada}
- **Notas:** {indicaciones especiales si las hay}

## 2. {nombre-descriptivo}.png
...
```

### Paso 6.2: Publicar borrador en Zendesk

1. **Crear artículo en español**:
   ```bash
   npx bun kb-article/scripts/zendesk.ts create {section_id} --title "{título}" --body "{HTML español}" --locale es --draft
   ```
   El comando devuelve el `article_id` y la URL del borrador.

2. **Añadir traducción en inglés**:
   ```bash
   npx bun kb-article/scripts/zendesk.ts translate {article_id} --title "{título en inglés}" --body "{HTML inglés}" --locale en
   ```

3. **Actualizar article-brief.md** con las URLs de los borradores

4. **Confirmar al usuario**:
   ```
   Artículo publicado como borrador en Zendesk:
   - Español: {URL}
   - Inglés: {URL}

   Archivos guardados en:
   {ruta en Obsidian}

   Recuerda añadir las imágenes listadas en images.md antes de publicar.
   ```

## Rutas del proyecto

Leer de `.kb-config.json`:
- **Proyecto Easymailing**: `project_path`
- **Vault Obsidian**: `obsidian_vault_path`
- **App de test**: `test_app.url`

## Invocación

```bash
/kb-article
```
