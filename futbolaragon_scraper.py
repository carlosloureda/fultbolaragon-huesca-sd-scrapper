import os
import re
import time
import json
from datetime import datetime
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright, TimeoutError
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill

class FutbolAragonScraper:
    def __init__(self, headless=True):
        self.headless = headless
        self.base_url = "https://www.futbolaragon.com"
        
    def setup_browser(self):
        self.playwright = sync_playwright().start()
        self.browser = self.playwright.chromium.launch(headless=self.headless)
        self.context = self.browser.new_context(locale="es-ES")
        self.page = self.context.new_page()
    
    def teardown_browser(self):
        if hasattr(self, 'browser'):
            self.browser.close()
        if hasattr(self, 'playwright'):
            self.playwright.stop()
            
    def handle_cookie_consent(self):
        print("[INFO] Navigating to home page to bypass cookie consent...")
        self.page.goto(self.base_url)
        try:
            self.page.wait_for_selector(".cmpboxbtnyes", timeout=5000)
            self.page.locator(".cmpboxbtnyes").click()
            print("[SUCCESS] Cookie consent accepted.")
            self.page.wait_for_timeout(1000)
        except TimeoutError:
            print("[INFO] No cookie consent wall detected or already accepted.")
        except Exception as e:
            print(f"[WARNING] Could not click cookie consent: {e}")

    def extract_matches_from_competition(self, cod_competicion, cod_grupo, jornadas, cod_delegacion=1, cod_temporada=21):
        """
        Loops through jornadas and extracts match URLs for a given competition.
        """
        match_urls = []
        for jornada in range(1, jornadas + 1):
            url = f"{self.base_url}/pnfg/NPcd/NFG_CmpJornada?cod_primaria=1000120&CodCompeticion={cod_competicion}&CodGrupo={cod_grupo}&CodTemporada={cod_temporada}&CodJornada={jornada}&Sch_Codigo_Delegacion={cod_delegacion}"
            print(f"[{jornada}/{jornadas}] Fetching Jornada...", end=" ")
            
            try:
                self.page.goto(url)
                self.page.wait_for_selector("table", timeout=10000)
                html = self.page.content()
                soup = BeautifulSoup(html, 'html.parser')
                
                # Find the link to the acta
                # Example: <a href="NFG_CmpPartido?cod_primaria=1000120&CodActa=866132" class="btn blue">Acta</a>
                acta_links = soup.find_all('a', href=re.compile(r'NFG_CmpPartido.*CodActa='))
                
                added = 0
                for link in acta_links:
                    href = link.get('href')
                    if href:
                        full_url = href if href.startswith('http') else f"{self.base_url}{href}"
                        match_urls.append(full_url)
                        added += 1
                print(f"Found {added} matches.")
                
            except Exception as e:
                print(f"Error fetching jornada {jornada}: {e}")
                
        return list(set(match_urls))
        
    def parse_match_report(self, url, target_team, match_length=80):
        print(f"[INFO] Parsing match: {url}")
        try:
            self.page.goto(url)
            self.page.wait_for_selector("table", timeout=10000)
            html = self.page.content()
        except Exception as e:
            print(f"[ERROR] Failed to load match report {url}: {e}")
            return None
            
        soup = BeautifulSoup(html, 'html.parser')
        
        data = {
            'match_info': {},
            'teams': {}
        }
        
        # Match Info
        header_info = soup.find('h5', class_='font-grey-cascade')
        if header_info:
            data['match_info']['subtitle'] = header_info.get_text(" ", strip=True)
            
        div_header = soup.find('h4', style=lambda value: value and 'display: inline-block' in value)
        if div_header:
            data['match_info']['division'] = div_header.get_text(strip=True)

        home_team_elem = soup.find('div', class_='font_widgetL')
        away_team_elem = soup.find('div', class_='font_widgetV')
        
        home_team = home_team_elem.get_text(strip=True) if home_team_elem else "Local"
        away_team = away_team_elem.get_text(strip=True) if away_team_elem else "Visitante"
        data['match_info']['home_team'] = home_team
        data['match_info']['away_team'] = away_team

        team_rosters = soup.find_all('div', class_='dashboard-stat grey')
        
        for roster in team_rosters:
            icon = roster.find('i', class_='fa-users')
            if not icon:
                continue
            
            team_name_elem = roster.find('div', class_='number')
            if not team_name_elem:
                continue
                
            team_name = team_name_elem.get_text(strip=True)
            data['teams'][team_name] = {'starters': [], 'subs': [], 'substitutions': []}
            
            blocks = roster.find('div', class_='desc').find_all(['h5', 'h4', 'table'])
            current_section = None
            for block in blocks:
                if block.name in ['h4', 'h5']:
                    text_content = block.get_text(strip=True)
                    if 'Titulares' in text_content:
                        current_section = 'starters'
                    elif 'Suplentes' in text_content:
                        current_section = 'subs'
                    elif 'Sustituciones' in text_content:
                        current_section = 'substitutions'
                    elif 'Tarjetas' in text_content or 'Cuerpo Técnico' in text_content:
                        current_section = None
                elif block.name == 'table':
                    if current_section in ['starters', 'subs']:
                        rows = block.find_all('tr')
                        for row in rows:
                            cols = row.find_all('td')
                            if len(cols) >= 2:
                                number = cols[0].get_text(strip=True)
                                if not number.isdigit(): 
                                    continue
                                name = cols[1].get_text(strip=True)
                                data['teams'][team_name][current_section].append({
                                    'number': number,
                                    'name': name
                                })
                    elif current_section == 'substitutions':
                        rows = block.find_all('tr')
                        if len(rows) == 2:
                            in_cols = rows[0].find_all('td')
                            out_cols = rows[1].find_all('td')
                            
                            if len(in_cols) >= 2 and len(out_cols) >= 2:
                                in_num = in_cols[0].get_text(strip=True)
                                in_name = in_cols[1].get_text(strip=True)
                                
                                out_num = out_cols[0].get_text(strip=True)
                                out_text = out_cols[1].get_text(strip=True)
                                
                                minute_match = re.search(r'\((\d+)\'\)', out_text)
                                minute = int(minute_match.group(1)) if minute_match else None
                                out_raw_name = re.sub(r'\(\d+\'\)', '', out_text).strip()
                                
                                data['teams'][team_name]['substitutions'].append({
                                    'in_number': in_num,
                                    'in_name': in_name,
                                    'out_number': out_num,
                                    'out_name': out_raw_name,
                                    'minute': minute
                                })

        # Calculate minutes
        target_stats = self._calculate_player_stats(data, target_team, match_length)
        if not target_stats:
            # Maybe the team name varies slightly, let's try fuzzy match
            for t_name in data['teams'].keys():
                if target_team.lower() in t_name.lower():
                    target_stats = self._calculate_player_stats(data, t_name, match_length)
                    break
                    
        return {
            'match_info': data['match_info'],
            'player_stats': target_stats
        }
        
    def _calculate_player_stats(self, parsed_data, target_team, match_length):
        team_data = parsed_data['teams'].get(target_team)
        if not team_data:
            return []

        player_stats = {}
        for p in team_data['starters']:
            player_stats[p['name']] = {
                'number': p['number'],
                'is_starter': True,
                'minutes_played': match_length,
                'entry_minute': 0,
                'exit_minute': match_length
            }
        
        for p in team_data['subs']:
            player_stats[p['name']] = {
                'number': p['number'],
                'is_starter': False,
                'minutes_played': 0,
                'entry_minute': None,
                'exit_minute': None
            }

        for sub in team_data['substitutions']:
            minute = sub['minute'] or match_length
            
            # Player Out
            out_p = player_stats.get(sub['out_name'])
            if out_p:
                out_p['exit_minute'] = minute
                if out_p['entry_minute'] is not None:
                    out_p['minutes_played'] = minute - out_p['entry_minute']
                    
            # Player In
            in_p = player_stats.get(sub['in_name'])
            if in_p:
                in_p['entry_minute'] = minute
                in_p['exit_minute'] = match_length
                in_p['minutes_played'] = match_length - minute

        stats_list = []
        for name, stats in player_stats.items():
            stats_list.append({
                'name': name,
                **stats
            })
        
        return sorted(stats_list, key=lambda x: (-x['minutes_played'], x['name']))

class ExcelExporter:
    def __init__(self, filename="futbolaragon_data.xlsx"):
        self.filename = filename
        self.wb = Workbook()
        
        # Setup sheets
        self.ws_matches = self.wb.active
        self.ws_matches.title = "Detalle Partidos"
        self.ws_players = self.wb.create_sheet(title="Resumen Jugadores")
        
        self._setup_headers()
        
    def _setup_headers(self):
        # Match Details Headers
        matches_headers = ["Jornada/Fecha", "División", "Local", "Visitante"]
        self.ws_matches.append(matches_headers)
        self._style_header(self.ws_matches)
        
        # Player Summary Headers
        players_headers = ["Partido", "Jugador", "Dorsal", "Titular", "Min. Entrada", "Min. Salida", "Minutos Jugados"]
        self.ws_players.append(players_headers)
        self._style_header(self.ws_players)
        
    def _style_header(self, ws):
        header_fill = PatternFill(start_color="1F4E78", end_color="1F4E78", fill_type="solid")
        header_font = Font(color="FFFFFF", bold=True)
        for cell in ws[1]:
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center")
            
    def append_match_data(self, match_data):
        info = match_data['match_info']
        match_title = f"{info.get('home_team')} vs {info.get('away_team')}"
        
        # Append match info
        self.ws_matches.append([
            info.get('subtitle', ''),
            info.get('division', ''),
            info.get('home_team', ''),
            info.get('away_team', '')
        ])
        
        # Append players
        for p in match_data.get('player_stats', []):
            titular = "Sí" if p['is_starter'] else "No"
            self.ws_players.append([
                match_title,
                p['name'],
                p['number'],
                titular,
                p['entry_minute'] if p['entry_minute'] is not None else "-",
                p['exit_minute'] if p['exit_minute'] is not None else "-",
                p['minutes_played']
            ])
            
    def save(self):
        self.wb.save(self.filename)
        print(f"[SUCCESS] Data exported to {self.filename}")

def main():
    # Setup params
    TARGET_TEAM = "HUESCA-S.D."
    COD_COMPETICION = "22320178"
    COD_GRUPO = "22401727"
    JORNADAS = 2  # Set to a low number for testing, we can increase it later
    
    scraper = FutbolAragonScraper(headless=True)
    exporter = ExcelExporter(filename="futbolaragon_data.xlsx")
    
    try:
        scraper.setup_browser()
        scraper.handle_cookie_consent()
        
        # Extract URLs
        match_urls = scraper.extract_matches_from_competition(
            cod_competicion=COD_COMPETICION, 
            cod_grupo=COD_GRUPO, 
            jornadas=JORNADAS
        )
        
        # Parse Matches
        for idx, url in enumerate(match_urls):
            print(f"--- Processing match {idx+1}/{len(match_urls)} ---")
            
            # The URL might need cod_acta added manually if not present, but the extraction gets it.
            match_data = scraper.parse_match_report(url, target_team=TARGET_TEAM)
            
            if match_data:
                # To ensure it was a match that Huesca played
                info = match_data['match_info']
                if TARGET_TEAM.lower() in info.get('home_team', '').lower() or TARGET_TEAM.lower() in info.get('away_team', '').lower():
                    exporter.append_match_data(match_data)
                else:
                    print(f"Skipped: {TARGET_TEAM} did not play this match.")
                    
            # Small delay to be polite
            time.sleep(1)
            
        exporter.save()
        
    finally:
        scraper.teardown_browser()

if __name__ == "__main__":
    main()
