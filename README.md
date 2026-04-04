# ⚽️ SD HUESCA | DataCenter & Scouting

Este proyecto automatiza la extracción de estadísticas de la Federación Aragonesa de Fútbol para el equipo de **División de Honor Cadete**.

---

## 🚀 Guía de Actualización Semanal

Para actualizar los datos de la web después de cada jornada, sigue estos 3 pasos:

### 1. Ejecutar el Scraper 🕵️‍♂️
Abre tu terminal en la carpeta `futbol_scraper` y ejecuta:

```bash
source venv/bin/activate
python3 futbolaragon_scraper.py
```

*Esto leerá todas las actas de la federación, extraerá los goles y minutos, y generará automáticamente los archivos de datos.*

### 2. Verificar Archivos Generados ✅
El script guarda los datos en:
- `dashboard/public/futbolaragon_data.json` (Para que la web funcione).
- `dashboard/public/futbolaragon_data.xlsx` (Para que los usuarios descarguen).

### 3. Subir a Internet 🌐
Para que los cambios se vean en [huesca-sd-cadetes.vercel.app](https://huesca-sd-cadetes.vercel.app/), solo tienes que subir los cambios a GitHub:

```bash
git add .
git commit -m "chore: actualizar estadísticas jornada X"
git push
```

---

## 🛠 Estructura del Proyecto

- **/futbol_scraper**: Contiene el motor de búsqueda en Python.
- **/futbol_scraper/dashboard**: La aplicación web (React + Tailwind).
- **/futbol_scraper/dashboard/public**: Donde viven los datos (el "corazón" de la web).

## ⚠️ Notas Técnicas
- El scraper usa **Playwright** para navegar como un humano y evitar bloqueos.
- La coincidencia de equipos es **exacta** por nombre ("HUESCA-S.D.") para no mezclar datos con el equipo Escuela.

---
*¡A por la liga! 🏆⚽️*
