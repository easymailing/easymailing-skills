---
name: em-newsletter
description: Crea emails para usuarios de Easymailing. Usa cuando el usuario dice "crear newsletter", "enviar email", "comunicar release", "email a usuarios", o quiere notificar algo a sus audiencias.
---

# Newsletter

Crea emails adaptados por audiencia para comunicar releases, contenido o comunicados a usuarios de Easymailing.

## Configuración

Lee de `.newsletter-config.json` en la carpeta de esta skill:

```json
{
  "obsidian_vault_path": "/ruta/al/vault",
  "project_path": "/ruta/al/proyecto/easymailing"
}
```

## Paso 1: Elegir tipo de comunicación

```
📧 ¿Qué quieres enviar?

1. 🚀 Release - Nueva versión o feature
2. 📝 Contenido - Blog, tutorial, tips
3. 📢 Comunicado - Aviso a usuarios registrados
```

## Paso 2: Elegir/crear contenido

### 🚀 Release

1. Lista las últimas 10 versiones/tags de git del proyecto Easymailing
2. Pregunta: "¿Qué versión(es) quieres comunicar?"
3. Para cada versión:
   - Analiza CHANGELOG.md
   - Revisa commits entre esa versión y la anterior
   - Busca en docs/plans/ documentación relacionada
4. Presenta features encontradas
5. Usuario confirma/ajusta qué destacar

### 📝 Contenido

1. Lista contenido reciente de Obsidian:
   - `Areas/Easymailing/Comunicacion/Blog/`
   - `Areas/Easymailing/Comunicacion/Integraciones/`
   - `Areas/Easymailing/Comunicacion/Paginas-Producto/`
2. Usuario selecciona cuáles incluir
3. Pregunta: "¿Añadir algo más?" (texto libre, novedades no documentadas)

### 📢 Comunicado

1. Pregunta: "¿De qué trata el comunicado?"
2. Usuario describe el mensaje
3. Pregunta: "¿Cuál es la acción esperada?" (informativo, requiere acción, etc.)

## Paso 3: Elegir audiencias

```
¿A quién enviar?

1. 🌐 Todos - Un solo email con CTA genérico
2. 🎯 Por audiencia - Versiones adaptadas (CTA diferente)

Si eliges "Por audiencia", selecciona cuáles:
[ ] 👤 Usuarios activos - Tienen cuenta y la usan
[ ] 😴 Usuarios inactivos - Registrados pero no usan
[ ] 📧 Suscriptores newsletter - Solo email, sin cuenta
```

**Opción 1 (Todos):** Genera un solo email con CTA neutro (ej: "Descubre más", "Ver novedades").

**Opción 2 (Por audiencia):** Genera versiones separadas con CTAs adaptados.

## Paso 4: Leer contexto

Antes de generar, lee:
- `{obsidian_vault_path}/Areas/Easymailing/Comunicacion/style-guide.md`
- `{obsidian_vault_path}/Areas/Easymailing/Comunicacion/product-marketing-context.md`

## Paso 5: Generar emails

Para CADA audiencia seleccionada, genera una versión del email con:

### Estructura del email

```markdown
# {Tipo} - {Título}

**Audiencia:** {audiencia}

**Asunto A:** {Versión A del asunto}
**Asunto B:** {Versión B del asunto - diferente enfoque}

**Preview text A:** {Complementa asunto A}
**Preview text B:** {Complementa asunto B}

---

{Contenido del email}

---

**CTA principal:** {texto del botón} → {URL}
```

### Adaptación por audiencia

| Audiencia | Tono | CTA típico |
|-----------|------|------------|
| **Activos** | Directo, como a un usuario que ya conoce el producto | "Pruébalo ahora", "Abre X en tu cuenta", "Ver en mi dashboard" |
| **Inactivos** | Recordatorio de valor, invitación a volver | "Vuelve y descubre X", "Reactiva tu cuenta", "Ve lo nuevo" |
| **Newsletter** | Educativo, invitación a probar | "Crea tu cuenta gratis", "Regístrate y prueba", "Empieza gratis" |

### Variantes A/B de asunto

- **Asunto A:** Enfoque directo o informativo
- **Asunto B:** Enfoque emocional, pregunta, o beneficio diferente
- Los preview texts complementan cada asunto, no lo repiten

## Paso 6: Mostrar preview

```
📧 Emails generados:

---
## 👤 Usuarios activos

**Asunto A:** {asunto}
**Asunto B:** {asunto}

{contenido}

**CTA:** {texto} → {url}

---
## 😴 Usuarios inactivos

**Asunto A:** {asunto}
**Asunto B:** {asunto}

{contenido adaptado}

**CTA:** {texto} → {url}

---

¿Ok o ajusto algo?
```

Iterar hasta que el usuario apruebe.

## Paso 7: Guardar

Ruta: `{obsidian_vault_path}/Areas/Easymailing/Comunicacion/Newsletters/{fecha}-{slug}/`

Estructura:
```
{fecha}-{slug}/
├── email.md        (si eligió "Todos")
├── activos.md      (si eligió "Por audiencia" y seleccionó activos)
├── inactivos.md    (si eligió "Por audiencia" y seleccionó inactivos)
└── newsletter.md   (si eligió "Por audiencia" y seleccionó suscriptores)
```

Cada archivo con el formato:

```markdown
---
type: newsletter
subtype: release | contenido | comunicado
audience: activos | inactivos | newsletter
created: YYYY-MM-DD
status: draft
---

# {Título}

**Asunto A:** {asunto}
**Asunto B:** {asunto}

**Preview text A:** {preview}
**Preview text B:** {preview}

---

{Contenido del email}

---

**CTA:** {texto} → {url}
```

## Paso 8: Confirmación

```
✅ Guardado en Areas/Easymailing/Comunicacion/Newsletters/{fecha}-{slug}/

Archivos creados:
- activos.md
- inactivos.md

Recuerda revisar y programar el envío en Easymailing.
```

## Idioma

Los emails se generan en **español** (audiencia principal de Easymailing).

Si se necesita versión en inglés, el usuario lo pide explícitamente y se genera como archivo separado (`activos-en.md`).

## Referencias

Para consistencia, lee el último newsletter similar si existe en:
`Areas/Easymailing/Comunicacion/Newsletters/`
