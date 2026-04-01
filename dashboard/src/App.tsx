import { useState, useEffect, useMemo } from 'react';
import './App.css';
import type { Dataset, PlayerAggregatedStats } from './types';
import DashboardView from './components/DashboardView';
import { Loader2 } from 'lucide-react';

function App() {
  const [data, setData] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/futbolaragon_data.json')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load JSON');
        return res.json();
      })
      .then((json: Dataset) => {
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading JSON data:", err);
        setError("Error cargando los datos de la liga.");
        setLoading(false);
      });
  }, []);

  const teamStats = useMemo<PlayerAggregatedStats[]>(() => {
    if (!data) return [];
    const stats: Record<string, PlayerAggregatedStats> = {};

    data.players.forEach(p => {
      if (!stats[p.Jugador]) {
        stats[p.Jugador] = {
          name: p.Jugador,
          dorsal: p.Dorsal !== "-" ? p.Dorsal : "?",
          minutos: 0,
          partidosConvocado: 0,
          partidosJugados: 0,
          titularidades: 0,
          vecesSuplente: 0,
          minutosPorPartido: 0,
          porcentajeTitular: 0,
          goles: 0,
          amarillas: 0,
          rojas: 0,
          asistencias: 0,
          posicion: p["Posición"] || "—"
        };
      }

      const s = stats[p.Jugador];
      s.partidosConvocado += 1;
      s.minutos += (p["Minutos Jugados"] || 0);
      s.titularidades += (p["Titularidad_num"] || 0);
      s.goles += (p["Goles"] || 0);
      s.amarillas += (p["Amarillas"] || 0);
      s.rojas += (p["Rojas"] || 0);
      s.asistencias += (p["Asistencias"] || 0);
      if (p["Posición"] && s.posicion === "—") s.posicion = p["Posición"];
      if (p["Jugó"] === "Sí") s.partidosJugados += 1;
      if (p["Suplente Usado"] === "Sí") s.vecesSuplente += 1;
    });

    const values = Object.values(stats);
    values.forEach(s => {
      s.minutosPorPartido = s.partidosJugados > 0 ? Number((s.minutos / s.partidosJugados).toFixed(1)) : 0;
      s.porcentajeTitular = s.partidosJugados > 0 ? Number((s.titularidades / s.partidosJugados * 100).toFixed(1)) : 0;
    });

    return values
      .filter(p => p.minutos > 0)
      .sort((a, b) => b.minutos - a.minutos);
  }, [data]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-slate-100 flex-col gap-4">
        <Loader2 className="animate-spin w-12 h-12 text-blue-500" />
        <h2 className="text-xl font-medium tracking-wide">Cargando base de datos táctica...</h2>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-slate-100">
        <h2 className="text-red-400 font-semibold">{error}</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans app-bg">
      <DashboardView dataset={data} teamStats={teamStats} />
    </div>
  );
}

export default App;
