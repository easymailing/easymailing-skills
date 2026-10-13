---
name: em-kb-article
description: Use when creating knowledge base articles for Easymailing. Also use when user says "crear artículo", "documentar", "base de conocimiento", "help center", "zendesk article", or similar documentation requests.
---

# Knowledge Base Article para Easymailing

Crea artículos de base de conocimiento para Easymailing, consultando código, navegando la app cuando sea necesario, y publicando como borrador en Zendesk.

## Dónde se escribe y cómo se publica

- **Help Center nuevo (Customer App):** los artículos se escriben en el repo `help-center` (`producto/help-center/`), siguiendo su `AGENTS.md`, y se sincronizan con la skill `em-help-center` (`hc`). Esta skill aporta el método de investigación, preguntas y redacción.
- **Help Center actual:** no se edita desde aquí.
- **App de test** para explorar pantallas y capturar: `https://acme.easymailing.test` (usuario y contraseña en el item `easymailing-test-app` del vault de agentes; los usa el script de capturas, nunca se escriben en el chat).

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

### Paso 1.3: Consultar lo que ya existe

1. **Estructura del Help Center nuevo**: `cat zendesk.json` en el repo `help-center` → propone la sección donde ubicar el artículo.
2. **Artículos relacionados en el repo**: `grep -ril "{tema}" articulos/es` y `node $HC_SKILL/scripts/hc.mjs afectados <ruta-de-la-pantalla>` → evita duplicados y sugiere enlaces cruzados.
3. **Help Center actual** (solo lectura, para estilo y contenido previo): `em-api zendesk GET "/help_center/articles/search.json?query={tema}"` y `em-api zendesk GET /help_center/articles/<id>.json`.
4. Si el artículo ya existe en el repo, **actualízalo** en vez de crear otro (Git guarda el historial).

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

1. Abre `https://acme.easymailing.test` (app de test) en el navegador
2. Haz login con el usuario de la app de test (credenciales en el item `easymailing-test-app`; si el navegador necesita la contraseña, pídesela a Sergio que la introduzca él o usa su gestor de contraseñas: nunca la escribas tú en el chat)
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

### Paso 5.3: Guardar en el repo

- Español: `articulos/es/<categoria>/<seccion>/<slug>.md` con el frontmatter de `help-center/AGENTS.md` (`estado: borrador`, `pantallas` con las rutas de la app).
- Inglés: mismo camino en `articulos/en/`, con `traduccion_de` = `hc hash` del español.
- Capturas en `imagenes/<slug>/`. Notas con `> [!INFO]` / `> [!AVISO]`. No hace falta generar HTML: lo hace `hc`.

## Fase 6: Sincronizar con Zendesk

1. `hc check` (corrige lo que señale).
2. `hc sync --dry-run` → enseña el plan a Sergio.
3. `hc sync` → crea el borrador en la marca nueva y guarda `zendesk_id`.
4. Haz commit en el repo `help-center` (un commit por artículo o tanda).
5. **Publicar** (`estado: publicado` + `hc sync`) solo cuando Sergio lo diga.
