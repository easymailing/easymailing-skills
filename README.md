# Easymailing Skills

Colección de skills para Claude Code orientadas a la gestión y comunicación del proyecto Easymailing.

## Skills disponibles

| Skill | Descripción |
|-------|-------------|
| [marketing-content](marketing-content/) | Genera contenido de marketing y comunicación |
| [kb-article](kb-article/) | Crea artículos de base de conocimiento para Zendesk |

## Configuración

En la primera ejecución, las skills que lo requieran solicitarán las rutas necesarias y crearán archivos de configuración locales (ignorados por git).

## Estructura

```
easymailing-skills/
├── {skill-name}/
│   ├── {skill-name}.md    # Skill ejecutable
│   ├── README.md          # Documentación de uso
│   └── docs/
│       └── design.md      # Documentación de diseño
└── ...
```

## Desarrollo

Ver [CLAUDE.md](CLAUDE.md) para convenciones del proyecto.
