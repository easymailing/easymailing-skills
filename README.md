# Easymailing Skills

Colección de skills para Claude Code orientadas a la gestión y comunicación del proyecto Easymailing.

## Instalación

```bash
/skill install https://github.com/easymailing/easymailing-skills.git
```

## Skills disponibles

| Skill | Descripción |
|-------|-------------|
| [em-capture-idea](capture-idea/) | Captura material para contenido desde URLs, bookmarks de Twitter o trending |
| [em-social-content](social-content/) | Genera posts bilingües para Twitter y LinkedIn desde el Inbox |
| [em-marketing-content](marketing-content/) | Genera contenido completo: blog, integraciones, páginas |
| [em-newsletter](newsletter/) | Crea emails adaptados por audiencia (activos, inactivos, suscriptores) |
| [em-kb-article](kb-article/) | Crea artículos de base de conocimiento para Zendesk |
| [em-release](release/) | Gestiona releases: versión semver, CHANGELOG, commit, push y GitHub release |

## Flujo de contenido

```
em-capture-idea          em-social-content
     │                         │
     ▼                         │
  Inbox/ ──────────────────────┘
     │
     ▼
em-marketing-content ──► Blog, Integraciones, Páginas
     │
     ▼
em-newsletter ──► Emails por audiencia
```

## Configuración

En la primera ejecución, las skills que lo requieran solicitarán las rutas necesarias y crearán archivos de configuración locales (ignorados por git).

## Estructura

```
easymailing-skills/
├── {skill-name}/
│   ├── SKILL.md           # Skill ejecutable
│   ├── .{name}-config.json # Configuración local (gitignored)
│   └── docs/
│       └── design.md      # Documentación de diseño
└── ...
```

## Desarrollo

Ver [CLAUDE.md](CLAUDE.md) para convenciones del proyecto.
