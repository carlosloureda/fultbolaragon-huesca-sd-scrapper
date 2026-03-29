# FutbolAragon Scraper

Un scraper en Python para extraer datos y estadísticas de partidos desde futbolaragon.com, específicamente diseñado para el equipo **HUESCA-S.D.** 

El sitio de FutbolAragón usa una protección anti-bots agresiva y bloqueos de cookies. Por esta razón, el scraper utiliza **Playwright** para simular un navegador Chromium real, aceptar automáticamente los términos de cookies, y luego descargar y analizar el DOM de las actas de cada partido usando **BeautifulSoup**.

## Requisitos

- Python 3.9 o superior
- Google Chrome o un navegador basado en Chromium (Playwright lo instanciará localmente)

## Instalación

1. Clona o entra a la carpeta del proyecto.
   ```bash
   cd /Users/carlos/Dev/projects/poker-trainer/futbol_scraper
   ```

2. Crea y activa un entorno virtual (opcional pero muy recomendado):
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Instala las dependencias en tu entorno:
   ```bash
   pip install -r requirements.txt
   ```

4. Instala el motor de navegador de Playwright (Chromium):
   ```bash
   playwright install chromium
   ```

## Ejecución

Una vez instaladas las dependencias, simplemente ejecuta:

```bash
python futbolaragon_scraper.py
```

En la función `main()` dentro del script `futbolaragon_scraper.py` puedes ajustar varios parámetros si deseas hacer pruebas con otro equipo o temporada:

```python
TARGET_TEAM = "HUESCA-S.D."
COD_COMPETICION = "22320178"
COD_GRUPO = "22401727"
JORNADAS = 2  # Cambia esto al número total de jornadas que quieras procesar (ej. 30)
```

## Resultados

El scraper generará automáticamente un archivo llamado `futbolaragon_data.xlsx` en el mismo directorio.
Este archivo Excel contendrá dos hojas:
1. **Detalle Partidos**: Lista general de partidos escrapeados con información de Jornada, Fecha y Local/Visitante.
2. **Resumen Jugadores**: Lista exhaustiva jugada a jugada de cada jugador del `TARGET_TEAM`, incluyendo:
   - Identificación del partido
   - Nombre del jugador y dorsal
   - ¿Ha sido titular? (Sí/No)
   - Minuto de entrada y salida (basado en un cálculo por defecto de 80 minutos)
   - **Minutos Jugados**: El cálculo de tiempo jugado durante ese partido.
