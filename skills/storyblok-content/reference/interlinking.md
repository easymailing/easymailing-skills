# Interlinking en Storyblok — Easymailing

Guia de enlaces internos entre stories del site easymailing.com.

## Estructura de URLs

Todas las URLs del site siguen el patron `https://easymailing.com/{carpeta}/{slug}`.

| Carpeta | Contenido | Volumen |
|---------|-----------|---------|
| `/blog/` | Articulos de blog | ~100+ |
| `/que-es/` | Glosario y definiciones | ~79 |
| `/integraciones/` | Paginas de integracion | ~79 |
| `/plataforma/` | Features del producto | ~10 |
| `/soluciones/` | Paginas por caso de uso | ~7 |
| `/industrias/` | Paginas por sector | ~5 |
| `/legal/` | Paginas legales | ~5 |
| `/recursos/` | Recursos descargables | ~2 |

Subcarpetas auxiliares (no son contenido enlazable):
- `/blog/categoria/`, `/blog/autor/`, `/blog/etiqueta/` — taxonomia del blog
- `/integraciones/categorias/`, `/integraciones/casos-de-uso/` — taxonomia de integraciones
- `/configuration/` — configuracion interna de Storyblok

## Links internos en richtext

En ProseMirror, un link interno es un `text` node con mark `link`:

```json
{
  "type": "text",
  "text": "mejores herramientas de email marketing",
  "marks": [{
    "type": "link",
    "attrs": {
      "href": "/blog/mejores-herramientas-email-marketing",
      "target": "_self",
      "linktype": "url"
    }
  }]
}
```

**Reglas:**
- Usar paths relativos (`/blog/slug`) para links internos, no URLs absolutas
- `target: "_self"` para internos, `"_blank"` para externos
- El anchor text debe ser descriptivo y natural (no "haz clic aqui")
- No enlazar la misma URL dos veces en el mismo articulo

## Patrones de enlazado

### Cluster linking

Los articulos de blog forman clusters tematicos. Cada cluster tiene un articulo pilar (broad topic) y articulos spoke (subtemas especificos).

Ejemplo cluster "email marketing":
```
Pilar: /blog/que-es-email-marketing
  ├── /blog/mejores-herramientas-email-marketing
  ├── /blog/automatizaciones-email-marketing
  ├── /blog/metricas-email-marketing
  └── /blog/como-crear-newsletter
```

Reglas de enlazado en clusters:
- Pilar enlaza a todos los spokes
- Cada spoke enlaza de vuelta al pilar
- Spokes relacionados se enlazan entre si cuando es natural

### Enlaces contextuales

Insertar links donde el texto naturalmente menciona un tema cubierto en otro articulo:
- "gestores de correo" → enlazar a `/blog/los-11-mejores-gestores-de-correos-y-sus-ventajas`
- "email marketing" → enlazar al pilar del cluster correspondiente
- "automatizacion" → enlazar a la guia de automatizaciones

### Cross-section linking

Enlazar entre secciones del site cuando sea relevante:
- Blog → Glosario: cuando se usa un termino definido en `/que-es/`
- Blog → Integraciones: cuando se menciona una herramienta integrada
- Blog → Plataforma: cuando se menciona una feature de Easymailing
- Glosario → Blog: para ampliar con articulos practicos

### CTA internos

Los links al registro o a paginas de producto no son interlinking editorial sino CTAs:
- Registro: `https://easymailing.com/registro`
- Pricing: `https://easymailing.com/precios`
- Estos se hacen mejor con componentes (PromoCard, call-to-action) que con links en texto

## Descubrir contenido para enlazar

```bash
# Listar stories de una carpeta
mcporter call storyblok.execute_readonly operation=listStories \
  parameters='{"space_id": 310467, "starts_with": "blog/", "per_page": 100}'

# Buscar stories por texto
mcporter call storyblok.execute_readonly operation=listStories \
  parameters='{"space_id": 310467, "search_term": "email marketing"}'

# Ver un articulo publicado completo
./skills/storyblok-content/scripts/cdn-get.sh blog/slug-del-articulo
```

## Cuantos links internos por articulo

- Minimo: 3 links internos relevantes
- Recomendado: 5-8 links internos
- Maximo: no hay limite, pero cada link debe aportar valor al lector
- Al menos 1 link externo autoritativo (fuente, estudio, herramienta mencionada)
