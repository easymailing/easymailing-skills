# Easymailing Skills

Colección de skills para Claude Code orientadas a la gestión y comunicación del proyecto Easymailing.

## Instalación

```bash
npx skills install https://github.com/easymailing/easymailing-skills.git -g
```

Instala todas las skills con prefijo `em-`.

## Actualización

```bash
npx skills install https://github.com/easymailing/easymailing-skills.git -g --force
```

## Skills disponibles

| Skill | Para qué | Comando |
|-------|----------|---------|
| [em-capture-idea](capture-idea/) | Guardar material para después | `/em-capture-idea` |
| [em-social-content](social-content/) | Posts para redes sociales | `/em-social-content` |
| [em-marketing-content](marketing-content/) | Blog, integraciones, páginas web | `/em-marketing-content` |
| [em-newsletter](newsletter/) | Emails a usuarios | `/em-newsletter` |
| [em-kb-article](kb-article/) | Artículos de ayuda (Zendesk) | `/em-kb-article` |
| [storyblok-content](storyblok-content/) | Páginas y contenido en Storyblok CMS | `/storyblok-content` |

> `em-release` se retiró de este repo: la versión canónica vive en `easymailingv2-docker/.claude/skills/em-release` (junto al código que releasea).

## Flujos de contenido

### Captura → Redes Sociales

```
em-capture-idea ──► Inbox/ ──► em-social-content ──► Twitter, LinkedIn, Facebook, Slack
```

**Fuentes de captura:**
- Twitter (bookmarks, trending, tweets)
- URLs (artículos, videos)
- Ideas propias

**Tipos de post en Twitter:**
- Post original
- Quote tweet
- Hilo (thread)
- Inspirado en

### Contenido Web

```
Código/CHANGELOG ──► em-marketing-content ──► Storyblok (borrador)
                                          └── Obsidian (backup)
```

**Tipos de contenido:**
- Blog (release, tutorial, comparativa, tips, estacional...)
- Integraciones
- Páginas de producto

### Newsletters

```
Código/Obsidian ──► em-newsletter ──► Por audiencia o único
```

**Tipos:** Release, Contenido, Comunicado

**Audiencias:**
- Usuarios activos → "Pruébalo en tu cuenta"
- Usuarios inactivos → "Vuelve y descubre"
- Suscriptores newsletter → "Crea tu cuenta gratis"
- Todos → "Descubre más"

### Artículos de Ayuda

```
Código/App de test ──► em-kb-article ──► Zendesk (borrador bilingüe)
                                      └── Obsidian/Knowledge-Base/
```

### Releases de Código

```
git status/diff ──► em-release ──► CHANGELOG.md
                               └── GitHub Release
```

## Servicios externos

| Servicio | Skills que lo usan | Para qué |
|----------|-------------------|----------|
| Twitter | em-capture-idea | Leer bookmarks, trending |
| Storyblok | em-marketing-content | Publicar blog, integraciones |
| Zendesk | em-kb-article | Publicar artículos de ayuda |
| GitHub | em-release | Crear releases |
| Chrome | em-kb-article | Navegar app de test |

## Configuración

En la primera ejecución, las skills que lo requieran solicitarán las rutas necesarias y crearán archivos de configuración locales (ignorados por git):

- `.social-config.json` - em-social-content
- `.content-config.json` - em-marketing-content
- `.newsletter-config.json` - em-newsletter
- `.kb-config.json` - em-kb-article

**Variables de entorno requeridas:**
- `STORYBLOK_TOKEN` - Para em-marketing-content
- `ZENDESK_API_TOKEN` - Para em-kb-article
- `EASYMAILING_TEST_PASSWORD` - Para em-kb-article (navegar app de test)

## Estructura del proyecto

```
easymailing-skills/
├── capture-idea/
│   └── SKILL.md
├── social-content/
│   ├── SKILL.md
│   └── .social-config.json (gitignored)
├── marketing-content/
│   ├── SKILL.md
│   ├── scripts/
│   │   └── storyblok.ts
│   └── .content-config.json (gitignored)
├── newsletter/
│   ├── SKILL.md
│   └── .newsletter-config.json (gitignored)
├── kb-article/
│   ├── SKILL.md
│   ├── scripts/
│   │   └── zendesk.ts
│   └── .kb-config.json (gitignored)
├── release/
│   └── SKILL.md
├── CLAUDE.md
├── CHANGELOG.md
└── README.md
```

## Estructura en Obsidian

```
Obsidian/
│
├── Inbox/                    ← em-capture-idea guarda aquí
│   ├── ideas/
│   ├── bookmarks/
│   └── trending/
│
├── Processed/                ← em-social-content mueve aquí
│   ├── ideas/
│   ├── bookmarks/
│   └── trending/
│
└── Areas/Easymailing/
    │
    ├── Comunicacion/
    │   ├── Social/           ← em-social-content
    │   ├── Blog/             ← em-marketing-content
    │   ├── Integraciones/    ← em-marketing-content
    │   ├── Paginas-Producto/ ← em-marketing-content
    │   ├── Newsletters/      ← em-newsletter
    │   ├── style-guide.md
    │   └── product-marketing-context.md
    │
    └── Knowledge-Base/       ← em-kb-article
```

## Desarrollo

Ver [CLAUDE.md](CLAUDE.md) para convenciones del proyecto.
