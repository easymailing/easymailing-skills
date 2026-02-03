# Knowledge Base Article Skill - Design Document

## Propósito

Crear artículos de base de conocimiento para Easymailing, consultando código fuente, navegando la app cuando sea necesario, y publicando como borrador en Zendesk. Los artículos se generan en español e inglés, con HTML formateado usando los componentes disponibles.

## Configuración

### Archivo `.kb-config.json` (ignorado en git)

```json
{
  "project_path": "/Users/sergio/Sites/easymailingv2-docker",
  "obsidian_vault_path": "/Users/sergio/Dev/knowledge",
  "zendesk_subdomain": "easymailing",
  "zendesk_email": "{email del usuario}",
  "test_app": {
    "url": "http://dfutura.easymailing.test",
    "user": "jhon@acme.com"
  }
}
```

### Variables de entorno (secretos)

| Variable | Descripción |
|----------|-------------|
| `ZENDESK_API_TOKEN` | Token de API de Zendesk (Settings → API) |
| `EASYMAILING_TEST_PASSWORD` | Password del usuario de test de la app |

### Primera ejecución

Si no existe `.kb-config.json`, la skill pregunta:

1. "¿Cuál es la ruta del proyecto Easymailing?"
2. "¿Cuál es la ruta del vault de Obsidian?"
3. "¿Cuál es tu email de Zendesk?"

Crea el archivo y recuerda configurar las variables de entorno.

## Flujo principal

```
INICIO
   ↓
FASE 1: Contexto inicial
├── Preguntar origen: ¿soporte, feature nueva, o detecté que falta?
├── Preguntar tema/funcionalidad
└── Consultar Zendesk API:
    ├── Categorías disponibles
    ├── Artículos relacionados (evitar duplicados, posibles enlaces)
    └── Leer 2-3 artículos existentes (análisis de estilo)
   ↓
FASE 2: Investigación
├── Revisar código del proyecto (profundidad según necesidad)
├── Revisar docs existentes
├── Si Claude cree necesario → pregunta: "¿Navego la app para entender mejor X?"
│   └── Si sí → Navegar con Chrome usando credenciales de test
└── Presentar lo encontrado
   ↓
FASE 3: Preguntas interactivas (una a una)
├── Clarificar qué debe explicar el artículo
├── Entender el pain point del usuario
├── Casos de uso principales
└── Acordar enfoque y alcance
   ↓
FASE 4: Propuesta de estructura
├── Outline con títulos + bullets por sección
├── Usuario valida/ajusta
└── Se acuerda estructura final
   ↓
FASE 5: Generación
├── Generar artículo en español (HTML con componentes)
├── Validar con usuario
├── Generar versión en inglés
└── Validar versión inglés
   ↓
FASE 6: Publicación
├── Guardar en Obsidian
├── Crear borrador en Zendesk (español e inglés)
└── Confirmar URLs de los borradores
```

## Flujo de entrada según origen

### Desde soporte
1. Usuario indica ticket o pregunta frecuente
2. Claude busca funcionalidad relacionada en código
3. Continúa a Fase 2

### Desde desarrollo (feature nueva)
1. Usuario indica la feature
2. Claude revisa commits recientes, changelog, código
3. Continúa a Fase 2

### Desde cero (detecté que falta)
1. Usuario indica el área o funcionalidad
2. Claude busca en código y docs existentes
3. Continúa a Fase 2

## Navegación de la app con Chrome

### Cuándo navegar

Claude pregunta antes de navegar si cree que es necesario:
- La UI no queda clara solo con el código
- Necesita ver el flujo completo de una funcionalidad
- Quiere verificar textos/labels actuales de la interfaz

Formato de pregunta:
> "Para entender mejor [X], ¿quieres que navegue la app y explore [pantalla/flujo específico]?"

### Credenciales de test

- **URL**: desde `test_app.url` en config
- **Usuario**: desde `test_app.user` en config
- **Password**: variable de entorno `EASYMAILING_TEST_PASSWORD`

### Flujo de navegación

1. Claude solicita permiso para navegar
2. Si usuario confirma:
   - Abre Chrome con la URL de test
   - Hace login con credenciales
   - Navega a la sección relevante
   - Explora y toma notas de la UI
3. Reporta lo observado al usuario
4. Continúa con las preguntas del artículo

### Limitaciones

- Claude NO toma capturas automáticas (solo placeholders descriptivos)
- Claude NO modifica datos en la app de test
- Solo navegación de lectura/exploración

## Integración con Zendesk API

### Operaciones necesarias

| Operación | Endpoint | Uso |
|-----------|----------|-----|
| Listar categorías | `GET /api/v2/help_center/categories` | Asignar categoría al artículo |
| Listar secciones | `GET /api/v2/help_center/sections` | Ubicar artículo en sección correcta |
| Buscar artículos | `GET /api/v2/help_center/articles/search?query=X` | Detectar duplicados, encontrar relacionados |
| Leer artículo | `GET /api/v2/help_center/articles/{id}` | Análisis de estilo |
| Crear borrador | `POST /api/v2/help_center/sections/{id}/articles` | Publicar borrador en español |
| Crear traducción | `POST /api/v2/help_center/articles/{id}/translations` | Añadir versión inglés |

### Autenticación

- Email + API token vía HTTP Basic Auth
- Base URL: `https://easymailing.zendesk.com`
- Token en variable de entorno: `ZENDESK_API_TOKEN`
- Email desde `.kb-config.json`

### Flujo de publicación

1. Consultar secciones de la categoría elegida
2. Crear artículo como borrador (`draft: true`) en español
3. Añadir traducción en inglés al mismo artículo
4. Devolver URLs de ambos borradores para revisión manual

## Estructura del artículo

### Idiomas

1. Primero se genera el artículo completo en español
2. Se valida con el usuario
3. Se genera la versión en inglés
4. Se valida la versión en inglés

### Propuesta de estructura

Claude propone un outline con:
- Títulos de cada sección
- Bullets con puntos clave a cubrir en cada sección

El usuario valida/ajusta antes de generar el contenido.

## Componentes HTML disponibles

Claude usa estos elementos según el contexto del artículo:

### Alertas

```html
<div class="alert alert-info">
  Información importante o tips
</div>

<div class="alert alert-warning">
  Advertencias o precauciones
</div>
```

### Pasos numerados

```html
<p>
  <span class="number">1</span> Descripción del paso
</p>
```

### Índice de contenidos (artículos largos)

```html
<div class="content-index">
  <p>Índice de contenidos</p>
  <p><a href="#seccion1">1. Título sección 1</a></p>
  <p><a href="#seccion2">2. Título sección 2</a></p>
</div>

<h2 id="seccion1">Título sección 1</h2>
```

### Tablas

```html
<!-- Tabla normal -->
<table>
  <tbody>
    <tr>
      <td class="gray"><strong>Destacado</strong></td>
      <td>Contenido</td>
    </tr>
  </tbody>
</table>

<!-- Tabla sin borde -->
<table class="no-border">
  <tbody>
    <tr>
      <td>Item 1</td>
      <td>Item 2</td>
    </tr>
  </tbody>
</table>
```

### Listas con énfasis

```html
<ul>
  <li><strong>Punto importante</strong></li>
  <li><strong>Otro punto</strong></li>
</ul>
```

### Alineación de texto

```html
<p class="text-center">Texto centrado</p>
<p class="text-right">Texto a la derecha</p>
```

### Placeholders de imágenes

```html
<!-- [CAPTURA: Descripción detallada de qué mostrar en la imagen] -->
<img src="PENDIENTE" alt="Descripción para alt text">
```

## Archivos generados

### Estructura en Obsidian

```
Areas/Easymailing/Knowledge-Base/{YYYY-MM-DD}-{slug}/
├── article-brief.md      # Resumen del artículo y decisiones
├── article-es.html       # HTML listo para Zendesk (español)
├── article-en.html       # HTML listo para Zendesk (inglés)
└── images.md             # Lista de capturas requeridas
```

### article-brief.md

```markdown
# {Título del artículo}

## Metadata
- Fecha: {YYYY-MM-DD}
- Categoría Zendesk: {categoría}
- Sección Zendesk: {sección}
- Origen: {soporte/feature nueva/faltaba documentación}

## Resumen
{Qué explica este artículo y por qué}

## Artículos relacionados
- {links a artículos existentes en Zendesk}

## Zendesk
- Borrador ES: {URL cuando se publique}
- Borrador EN: {URL cuando se publique}
```

### images.md

```markdown
# Imágenes requeridas

## 1. {nombre-descriptivo}.png
- **Ubicación en HTML:** Sección "{nombre sección}"
- **Qué mostrar:** {descripción detallada de la captura}
- **Notas:** {cualquier indicación especial}

## 2. {nombre-descriptivo}.png
...
```

## Invocación

```bash
/kb-article
```

## Pendientes

- [ ] Implementar la skill
- [ ] Crear README.md con instrucciones de uso
- [ ] Añadir `.kb-config.json` a .gitignore del repo
