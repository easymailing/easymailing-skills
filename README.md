# Easymailing Skills

Colección de skills para Claude Code orientadas a la gestión y comunicación del proyecto Easymailing.

## Instalación

```bash
git clone git@github.com:easymailing/easymailing-skills.git && easymailing-skills/bin/install
```

Enlaza las skills en Claude Code y Codex y añade `bin/` (`em-api`) al PATH. Reglas en [AGENTS.md](AGENTS.md).

## Actualización

```bash
npx skills install https://github.com/easymailing/easymailing-skills.git -g --force
```

## Skills disponibles

| Skill | Qué hace |
|---|---|
| [`em-capture-idea`](skills/capture-idea/) | Captura material para contenido desde URLs, texto libre, bookmarks de Twitter o trending |
| [`em-chartmogul`](skills/chartmogul/) | ChartMogul de Easymailing en solo lectura: MRR, ARR, ARPA, número de clientes, tasas de bajas (clientes y MRR), LTV, búsqueda de clientes y  |
| [`em-sentry`](skills/sentry/) | Errores de producción en Sentry: incidencias, detalle con stacktrace, eventos, resumen de 24 h y resolver (con confirmación), de `easymailing` y `customer-app` |
| [`dataforseo`](skills/dataforseo/) | Datos SEO de DataForSEO por línea de comandos — volumen y dificultad de keywords, backlinks, SERP, competidores, tendencias, auditorías técn |
| [`easymailing-admin-api`](skills/easymailing-admin-api/) | Consulta la Admin API interna de Easymailing: dashboard de plataforma, delivery servers y scores, IP blocks, salud/métricas/issues de una ap |
| [`easymailing-kb`](skills/easymailing-kb/) | Busca en la documentación pública de Easymailing (help center, blog, API pública, integraciones, precios, legal) y es la fuente de verdad pa |
| [`em-help-center`](skills/help-center/) | Help Center NUEVO de la Customer App (segunda marca de Zendesk, no pública hasta el lanzamiento): sincroniza los artículos Markdown del repo |
| [`em-kb-article`](skills/kb-article/) | Use when creating knowledge base articles for Easymailing |
| [`mailerq-api`](skills/mailerq-api/) | Diagnostica la infraestructura de envío de Easymailing con la API de MailerQ: tasas de entrega, bounces, bloqueos de IP, throttling, logs de |
| [`em-marketing-content`](skills/marketing-content/) | Use when creating marketing content for Easymailing - blog articles, integration pages, or product pages |
| [`em-newsletter`](skills/newsletter/) | Crea emails para usuarios de Easymailing |
| [`snds`](skills/snds/) | Consulta Microsoft SNDS (Smart Network Data Services) para ver la reputación de nuestras IPs en Outlook/Hotmail: estado del listing y datos  |
| [`em-social-content`](skills/social-content/) | Genera posts para redes sociales (Twitter, LinkedIn, Facebook) y comunicación interna (Slack) |
| [`storyblok-content`](skills/storyblok-content/) | Storyblok CMS (web de easymailing.com) — crear y editar páginas, artículos de blog, integraciones, comparativas y landings; vista previa de  |
| [`em-stripe`](skills/stripe/) | Stripe de Easymailing en solo lectura: cobros (y cobros fallidos), facturas, suscripciones, clientes y disputas |
| [`em-zendesk-support`](skills/zendesk-support/) | Tickets de soporte de Easymailing en Zendesk (lectura): tickets abiertos o pendientes, detalle de un ticket con su conversación, búsqueda y  |

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
