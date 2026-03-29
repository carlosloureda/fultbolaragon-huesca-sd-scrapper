export interface Match {
  "Jornada/Fecha": string;
  "División": string;
  "Partido": string;
  "Equipo": string;
  "Rival": string;
  "Condición": "Local" | "Visitante";
}

export interface PlayerLog {
  "Partido": string;
  "Rival": string;
  "Condición": "Local" | "Visitante";
  "Jugador": string;
  "Dorsal": number | "-";
  "Titular": "Sí" | "No";
  "Min. Entrada": number;
  "Min. Salida": number;
  "Minutos Jugados": number;
  "Jugó": "Sí" | "No";
  "Suplente Usado": "Sí" | "No";
  "Titularidad_num": 1 | 0;
}

export interface Dataset {
  matches: Match[];
  players: PlayerLog[];
}

export interface PlayerAggregatedStats {
  name: string;
  dorsal: number | string;
  minutos: number;
  partidosConvocado: number;
  partidosJugados: number;
  titularidades: number;
  vecesSuplente: number;
  minutosPorPartido: number;
  porcentajeTitular: number;
}
