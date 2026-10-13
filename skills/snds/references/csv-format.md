# Formato CSV de SNDS

Los dos endpoints de Automated Data Access devuelven CSV plano **sin fila de cabecera**. Hay que mapear las columnas por posicion.

## DataKey (`/DataKey?Date=MMDDYY`; `snds datos`)

13 columnas. Una fila por IP y franja de actividad (las franjas suelen ser de ~1h, pero pueden agruparse). Nombre del fichero: depende de la fecha.

| # | Columna | Formato / valores | Notas |
|---|---|---|---|
| 1 | IP address | IPv4, p.ej. `193.3.232.11` | Nuestras IPs estan en el rango `193.3.232.x` |
| 2 | Activity period start | `M/D/YYYY h:mm AM/PM` (PST), p.ej. `5/10/2026 1:00 AM` | Hora del Pacifico |
| 3 | Activity period end | igual que la 2, p.ej. `5/10/2026 11:00 AM` | |
| 4 | RCPT commands | entero | Numero de comandos RCPT recibidos |
| 5 | DATA commands | entero | = mensajes (numero de comandos DATA) |
| 6 | Message recipients | entero | Destinatarios |
| 7 | Filter result | `GREEN` / `YELLOW` / `RED` | Reputacion de la IP segun SNDS |
| 8 | Complaint rate | rango como string: `< 0.1%`, `0.1% - 1%`, `> 1%` | Es un rango, no un valor exacto |
| 9 | Trap message period start | fecha, o vacio si 0 trap hits | |
| 10 | Trap message period end | fecha, o vacio | |
| 11 | Trap hits | entero, p.ej. `0`, `1` | Impactos en spam-traps |
| 12 | Sample HELO | string, a menudo vacio | Muestra del HELO usado |
| 13 | Sample MAIL FROM | string, a menudo vacio | Muestra del MAIL FROM |

Ejemplo de fila (IP sana, sin trap hits):

```
193.3.232.11,5/10/2026 1:00 AM,5/10/2026 11:00 AM,1371,1371,1371,GREEN,< 0.1%,,,0,,
```

Ejemplo de fila con un trap hit:

```
193.3.232.28,5/4/2026 3:00 PM,5/5/2026 8:00 AM,621,621,621,YELLOW,< 0.1%,5/4/2026 7:53 PM,5/4/2026 7:53 PM,1,,
```

### Como leerlo
- Una IP puede tener varias filas en un dia (varias franjas). Para resumir, sumar columnas 4-6 y quedarse con el peor `Filter result` y el `Complaint rate` mas alto del dia.
- `Filter result` GREEN + `Complaint rate` `< 0.1%` + `Trap hits` 0 = reputacion limpia en SNDS. Esto **no** descarta un bloqueo de EOP/OLC (ver SKILL.md, seccion "Bloqueo SNDS != bloqueo de entrega").
- `Filter result` RED/YELLOW, complaint rate alto o trap hits no nulos = problema real de reputacion.

## IpStatusKey (`/IpStatusKey`; `snds estado`)

Nombre del fichero (Content-Disposition): `snds.ipstatus.MMDDYY.csv`.

En el portal nuevo, sin listings devuelve `404` (en el antiguo era 200 vacio): ninguna IP nuestra esta listada con estado anormal en SNDS. No hemos podido observar una muestra no vacia.

Segun la documentacion de Microsoft, cuando es no vacio lista los rangos de IP con estado anormal con estas columnas (a confirmar contra una extraccion real no vacia):

| # | Columna | Notas |
|---|---|---|
| 1 | IP range start | Inicio del rango listado |
| 2 | IP range end | Fin del rango listado |
| 3+ | Estado / motivo del bloqueo | Estado o razon del listing — el conjunto exacto de columnas debe confirmarse con una extraccion real no vacia |

Mientras el cuerpo siga vacio, el resumen es simplemente: "No aparece ninguna IP nuestra en el IP Status list de SNDS".

## Como resumir los datos de una IP

Condensa la actividad de una IP en 3-4 lineas para un comentario de tarea o un email:

> SNDS para 193.3.232.30 (datos del 9 may 2026): Filter result GREEN, complaint rate < 0.1%, 0 trap hits, ~12.4k RCPT / 9.8k mensajes. No aparece en el IP Status list de SNDS (sin listing activo).

Si SNDS esta limpio pero MailerQ muestra rechazos 550 de Outlook, anadir esta linea de seguimiento:

> Pese a estos datos limpios, MailerQ registra rechazos 550 5.7.x de Outlook.com en esta IP. El bloqueo es de EOP/OLC (sistema distinto de SNDS), no de reputacion SNDS — se solicita delist por el portal OLC y en la respuesta a Microsoft se adjuntan estos datos SNDS preguntando por que EOP bloquea pese a ellos.

Si el dato SI muestra problema (RED/YELLOW, complaint rate alto, trap hits):

> SNDS para 193.3.232.X (datos del D mmm YYYY): Filter result YELLOW, complaint rate < 0.1%, 1 trap hit el 4 may a las 19:53 PST. Senal de reputacion degradada — revisar lista/origen del trafico antes de pedir delist.
