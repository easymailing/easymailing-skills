# Marketing Content

Skill para generar contenido de comunicación y marketing para Easymailing.

## Tipos de contenido

| Tipo | Descripción |
|------|-------------|
| 🚀 Release | Comunicar nueva versión |
| ✨ Feature spotlight | Destacar feature existente |
| 📖 Tutorial | Cómo hacer X con Easymailing |
| ⚔️ Comparativa | Easymailing vs alternativa |
| 📰 Tendencia | Comentar novedad del sector |
| 💡 Tips y trucos | Contenido educativo corto |
| 🎄 Estacional | Black Friday, Navidad, etc. |

## Uso

```bash
# Invocar skill (muestra menú de tipos)
/marketing-content

# Tipo específico
/marketing-content release
/marketing-content tutorial
/marketing-content comparativa
```

## Flujo

1. **Entrada** - Según el tipo, Claude busca información o pide contexto
2. **Discusión** - Propone destacados, usuario confirma/ajusta y añade contexto
3. **Master Brief** - Genera documento base con todo lo acordado
4. **Selección de canales** - Usuario elige qué contenido generar
5. **Generación** - Produce contenido por canal delegando a skills de marketing

## Canales disponibles

| Canal | Descripción |
|-------|-------------|
| 📝 Blog | Artículo narrativo completo |
| 📧 Newsletter | Email para suscriptores |
| 🐦 Twitter | Posts o hilo |
| 💼 LinkedIn | Post profesional |
| 📘 Facebook | Post intermedio |
| 📢 Slack | Resumen para equipo interno |
| 🎯 Teasers | Adelantos para generar expectación |

## Contenido generado

```
{carpeta}/
├── master-brief.md
├── blog.md
├── newsletter.md
├── slack.md
├── social/
│   ├── twitter.md
│   ├── linkedin.md
│   └── facebook.md
└── teasers/
    └── teasers.md
```

## Dónde se guarda

El contenido se guarda en Obsidian:

```
Areas/Easymailing/Comunicacion/
├── Releases/v{version}/      ← releases
└── Content/{fecha}-{slug}/   ← otro contenido
```

## Documentación

- [Diseño detallado](docs/design.md)
