# Marketing Content

Skill para generar contenido de comunicación y marketing para Easymailing.

## Tipos de contenido

| Tipo | Descripción | Destino |
|------|-------------|---------|
| 📝 Blog | Artículos (release, tutorial, comparativa...) | Storyblok + Obsidian |
| 🔌 Integración | Página de nueva integración | Storyblok + Obsidian |
| 📦 Página de producto | Funcionalidad, solución... | Storyblok + Obsidian |
| 📧 Newsletter | Comunicación con contenidos existentes | Obsidian |

## Uso

```bash
/marketing-content
```

## Flujo

### Blog
1. Elegir motivo (release, tutorial, comparativa, etc.)
2. Recopilar información según motivo
3. Discusión interactiva
4. Crear master-brief
5. Generar artículo
6. Publicar en Storyblok + Obsidian
7. Opcionalmente distribuir en redes

### Integración
1. Nombre de la integración
2. Recopilar campos (título, descripción, categorías, casos de uso...)
3. Publicar en Storyblok + Obsidian
4. Opcionalmente distribuir en redes

### Página de producto
1. Tipo (funcionalidad, solución, otro)
2. Discusión interactiva
3. Proponer estructura con componentes
4. Publicar en Storyblok + Obsidian
5. Opcionalmente distribuir en redes

### Newsletter
1. Listar contenidos recientes
2. Seleccionar cuáles incluir
3. Discusión (añadir extras, enfoque, CTA)
4. Generar con variantes A/B
5. Guardar en Obsidian

## Distribución en redes

Después de crear Blog, Integración o Página de producto:

| Canal | Descripción |
|-------|-------------|
| 🐦 Twitter | Posts o hilo |
| 💼 LinkedIn | Post profesional |
| 📘 Facebook | Post intermedio |
| 🎯 Teasers | Adelantos |
| 📢 Slack | Resumen interno |

## Dónde se guarda

```
Areas/Easymailing/Comunicacion/
├── Blog/{slug}/
│   ├── master-brief.md
│   ├── article.md
│   └── social/
├── Integraciones/{slug}/
│   ├── integration.md
│   └── social/
├── Paginas-Producto/{slug}/
│   ├── page-spec.md
│   └── social/
└── Newsletters/{fecha}-{slug}/
    └── newsletter.md
```

## Storyblok content types

| Tipo | Content type |
|------|--------------|
| Blog | `content-blog-article` |
| Integración | `content-integration` |
| Página de producto | `content-static-page` |

## Configuración

Archivo `.content-config.json`:

```json
{
  "project_path": "{ruta al proyecto}",
  "obsidian_vault_path": "{ruta al vault}",
  "storyblok": {
    "space_id": "{id del espacio}"
  }
}
```

Archivo `.env`:

```
STORYBLOK_TOKEN=tu_token_de_management_api
```

## Documentación

- [Diseño v2](../docs/plans/2026-02-04-marketing-content-v2-design.md)
