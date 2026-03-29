# FutbolAragon Scraper

Un scraper en Python para extraer datos y estadísticas de partidos desde futbolaragon.com, específicamente diseñado para el equipo **HUESCA-S.D.** 

## Sobre la web (futbolaragon.com)

El sitio web de la Federación Aragonesa de Fútbol presenta varios desafíos y estructuras específicas:

1. **Protección Anti-Bots**: El sitio bloquea peticiones HTTP directas (usando librerías como `requests`) retornando respuestas vacías (0 bytes) si no detecta un navegador real. Además, utiliza un gestor de cookies estricto. Por esta razón, el scraper utiliza **Playwright** para simular un navegador Chromium, navegar a la página principal y hacer clic automáticamente en el botón de "Aceptar todo" (`.cmpboxbtnyes`).
2. **Estructura de URLs**:
   - **Jornadas (`NFG_CmpJornada`)**: Dado que la ficha del equipo no expone fácilmente las actas, el scraper recorre el calendario jornada a jornada usando parámetros como `CodCompeticion`, `CodGrupo` y `CodJornada` para encontrar los enlaces a los partidos.
     - *Ejemplo URL Jornada*: `https://www.futbolaragon.com/pnfg/NPcd/NFG_CmpJornada?cod_primaria=1000120&CodCompeticion=22320178&CodGrupo=22401727&CodTemporada=21&CodJornada=1&Sch_Codigo_Delegacion=1`
   - **Actas de los partidos (`NFG_CmpPartido`)**: Cada enlace de acta contiene el detalle del partido, incluyendo alineaciones (Titulares/Suplentes), cuerpo técnico, goles y tarjetas (Sustituciones).
     - *Ejemplo URL Acta de Partido*: `https://www.futbolaragon.com/pnfg/NPcd/NFG_CmpPartido?cod_primaria=1000120&CodActa=866132&cod_acta=866132`
3. **Cálculo de Minutos**: El sitio no proporciona directamente los minutosJugados por jugador. Indica quién fue titular, quién fue suplente y, en la sección de sustituciones, el minuto exacto en el que un jugador entra (ícono de flecha verde) y otro sale (ícono de flecha roja). El scraper se encarga de calcular matemáticamente los minutos jugados asumiendo una duración estándar de partido (por defecto 80 minutos para categoría Cadete).

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
```

El scraper leerá dinámicamente la página de la competición, descubrirá cuántas jornadas tiene la liga en total de forma automática, y descargará únicamente los partidos en los que haya participado el equipo objetivo, omitiendo el resto para optimizar el tiempo.

## Resultados

El scraper generará automáticamente un archivo llamado `futbolaragon_data.xlsx` en el mismo directorio.

## Ejecución en Servidor (Linux / Headless)

Si necesitas desplegar este scraper en un servidor (por ejemplo, AWS, VPS, Ubuntu) que no tiene interfaz gráfica, **no debes cambiar `headless=True`** en el código, ya que la protección antibots de *futbolaragon* bloquea las peticiones si detecta un navegador oculto tradicional.

En su lugar, la forma correcta y profesional de ejecutarlo en un servidor sin pantalla es utilizar **Xvfb** (X virtual framebuffer) para emular una pantalla virtual.

1. Instala Xvfb en tu servidor:
   ```bash
   sudo apt-get install xvfb
   ```
2. Ejecuta el script dentro del display virtual:
   ```bash
   xvfb-run python futbolaragon_scraper.py
   ```
De esta forma, el navegador cree que está abierto de forma visible (`headless=False`) evadiendo los bloqueos, pero funcionando perfectamente en un entorno de servidor por consola de comandos.
Este archivo Excel contendrá dos hojas:
1. **Detalle Partidos**: Lista general de partidos escrapeados con información de Jornada, Fecha y Local/Visitante.
2. **Resumen Jugadores**: Lista exhaustiva jugada a jugada de cada jugador del `TARGET_TEAM`, incluyendo:
   - Identificación del partido
   - Nombre del jugador y dorsal
   - ¿Ha sido titular? (Sí/No)
   - Minuto de entrada y salida (basado en un cálculo por defecto de 80 minutos)
   - **Minutos Jugados**: El cálculo de tiempo jugado durante ese partido.
