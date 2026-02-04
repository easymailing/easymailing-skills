# KB Article Skill

Crea artículos de base de conocimiento para Easymailing, consultando código fuente, navegando la app cuando sea necesario, y publicando como borrador en Zendesk.

## Uso

```bash
/kb-article
```

## Características

- **Análisis de código**: Revisa el código de Easymailing para entender funcionalidades
- **Navegación de la app**: Explora la UI con Chrome cuando es necesario
- **Integración Zendesk**: Consulta artículos existentes y publica borradores
- **Bilingüe**: Genera artículos en español e inglés
- **Componentes HTML**: Usa elementos estilizados (alertas, pasos, tablas, etc.)
- **Placeholders de imágenes**: Documenta las capturas necesarias

## Configuración

### Primera ejecución

La skill preguntará por:
- Ruta del proyecto Easymailing
- Ruta del vault de Obsidian
- Email de Zendesk

Estos valores se guardan en `.kb-config.json` (ignorado en git).

### Variables de entorno

Configura estas variables antes de usar la skill:

```bash
export ZENDESK_API_TOKEN="tu_token_de_zendesk"
export EASYMAILING_TEST_PASSWORD="password_del_usuario_test"
```

### Estructura de `.kb-config.json`

```json
{
  "project_path": "/ruta/al/proyecto/easymailing",
  "obsidian_vault_path": "/ruta/al/vault/obsidian",
  "zendesk_subdomain": "easymailing",
  "zendesk_email": "tu@email.com",
  "test_app": {
    "url": "http://dfutura.easymailing.test",
    "user": "jhon@acme.com"
  }
}
```

## Flujo

1. **Contexto inicial**: Origen del artículo + tema + consulta Zendesk
2. **Investigación**: Código + navegación app (si necesario)
3. **Preguntas**: Clarificación una a una
4. **Estructura**: Outline con títulos y bullets
5. **Generación**: Español → validación → Inglés → validación
6. **Publicación**: Obsidian + borrador en Zendesk

## Archivos generados

```
Areas/Easymailing/Knowledge-Base/{YYYY-MM-DD}-{slug}/
├── article-brief.md      # Metadata y resumen
├── article-es.html       # HTML español
├── article-en.html       # HTML inglés
└── images.md             # Capturas requeridas
```

## Componentes HTML disponibles

| Componente | Uso |
|------------|-----|
| `alert alert-info` | Tips e información importante |
| `alert alert-warning` | Advertencias |
| `span.number` | Pasos numerados |
| `content-index` | Índice de contenidos |
| `table` / `table.no-border` | Tablas con/sin borde |
| `td.gray` | Celdas destacadas |
| `text-center` / `text-right` | Alineación |

## API de Zendesk

La skill usa estos endpoints:

- `GET /categories` - Listar categorías
- `GET /sections` - Listar secciones
- `GET /articles/search` - Buscar artículos
- `GET /articles/{id}` - Leer artículo
- `POST /sections/{id}/articles` - Crear borrador
- `POST /articles/{id}/translations` - Añadir traducción

## Documentación

Ver [docs/plans/2026-02-03-kb-article-design.md](../docs/plans/2026-02-03-kb-article-design.md) para el documento de diseño completo.
