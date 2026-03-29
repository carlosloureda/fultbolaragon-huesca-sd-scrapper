import React, { useState, useMemo } from 'react';
import type { Dataset, PlayerAggregatedStats } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTTooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { Users, Activity, Target, Shield, ArrowUpCircle } from 'lucide-react';

export default function DashboardView({ dataset, teamStats }: { dataset: Dataset, teamStats: PlayerAggregatedStats[] }) {
  const [selectedPlayer, setSelectedPlayer] = useState<string>('TODO');
  const { matches, players } = dataset;

  // GLOBAL CONTEXT CALCS
  const teamAverageMins = useMemo(() => {
    if (teamStats.length === 0) return 0;
    const totalMins = teamStats.reduce((acc, curr) => acc + curr.minutos, 0);
    return totalMins / teamStats.length;
  }, [teamStats]);

  // PLAYER CONTEXT
  const playerFocus = useMemo(() => {
    if (selectedPlayer === 'TODO') return null;
    return teamStats.find(p => p.name === selectedPlayer) || null;
  }, [selectedPlayer, teamStats]);

  // HIGH IMPACT KPIs
  const kpis = useMemo(() => {
    if (!playerFocus) {
      // Team KPIs
      return [
        { title: "Plantilla Activa", value: teamStats.length, icon: <Users size={20}/>, desc: "Suman al menos 1 min" },
        { title: "Partidos Scout", value: matches.length, icon: <Target size={20}/>, desc: "Base de datos viva" },
        { title: "Media de Minutos", value: `${Math.round(teamAverageMins)}'`, icon: <Activity size={20}/>, desc: "Promedio global base" },
        { title: "Rotaciones", value: "Alta", icon: <Shield size={20}/>, desc: "Basado en suplencias usadas" }
      ];
    } else {
      // Specific Player logic (E.g. Efecto Revulsivo, Confiabilidad)
      const logs = players.filter(p => p.Jugador === playerFocus.name);
      const titularMins = logs.filter(p => p.Titular === "Sí").reduce((acc, p) => acc + p["Minutos Jugados"], 0);
      const suplenteMins = logs.filter(p => p.Titular === "No" && p["Minutos Jugados"] > 0).reduce((acc, p) => acc + p["Minutos Jugados"], 0);

      const titularAvg = playerFocus.titularidades > 0 ? Math.round(titularMins / playerFocus.titularidades) : 0;
      const suplenteAvg = playerFocus.vecesSuplente > 0 ? Math.round(suplenteMins / playerFocus.vecesSuplente) : 0;

      // Reliability: Matches played / Matches available (Total Matches in Dataset)
      const reliability = Math.round((playerFocus.partidosJugados / Math.max(matches.length, 1)) * 100);

      return [
        { title: "Mins como Titular", value: `${titularAvg}'`, icon: <Shield size={20}/>, desc: "Media al salir de inicio" },
        { title: "Mins como Revulsivo", value: `${suplenteAvg}'`, icon: <ArrowUpCircle size={20}/>, desc: "Media entrando de suplente" },
        { title: "Confianza del Míster", value: `${reliability}%`, icon: <Activity size={20}/>, desc: "Asistencia en partidos" },
        { title: "Minutos Totales", value: `${playerFocus.minutos}'`, icon: <Target size={20}/>, desc: `Rank #${teamStats.findIndex(p => p.name === playerFocus.name) + 1} de ${teamStats.length}` }
      ];
    }
  }, [playerFocus, teamStats, matches, players, teamAverageMins]);

  // CHART DATA: Evolution over season
  const evolutionData = useMemo(() => {
    // We map every match in order. The JSON currently just lists matches chronologically, wait:
    // It's technically safe to use original string or just index
    return matches.map((match, i) => {
      const matchName = match.Partido;
      const dataPoint: any = { matchName: `J${i+1}: ${match.Rival}` };

      // Base: The Team average for this specific match.
      const matchLogs = players.filter(p => p.Partido === matchName && p["Minutos Jugados"] > 0);
      const avgMins = matchLogs.length > 0 ? matchLogs.reduce((acc, curr) => acc + curr["Minutos Jugados"], 0) / matchLogs.length : 0;
      dataPoint.mediaEquipo = Math.round(avgMins);

      if (playerFocus) {
        // Did the player play this match?
        const entry = matchLogs.find(p => p.Jugador === playerFocus.name);
        dataPoint.minutosJugador = entry ? entry["Minutos Jugados"] : 0;
      }
      return dataPoint;
    });
  }, [matches, players, playerFocus]);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-800/60 p-5 rounded-2xl border border-slate-700/50 backdrop-blur-md">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
            Huesca SD - Pro Scout
          </h1>
          <p className="text-sm text-slate-400">Plataforma de inteligencia deportiva. Contexto actual: {selectedPlayer === 'TODO' ? 'Equipo Global' : selectedPlayer}</p>
        </div>

        <div className="relative">
          <select 
            value={selectedPlayer}
            onChange={(e) => setSelectedPlayer(e.target.value)}
            className="appearance-none bg-slate-900 border border-slate-700 text-slate-100 rounded-xl px-5 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer shadow-lg"
          >
            <option value="TODO">🌐 Modo Panorámico (Todo el Equipo)</option>
            <optgroup label="Jugadores">
              {teamStats.map(p => (
                <option key={p.name} value={p.name}>{p.name} (Dorsal {p.dorsal})</option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      {/* 4 HIGH IMPACT KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/30 flex flex-col gap-2 hover:bg-slate-800/80 transition-colors shadow-sm">
            <div className="flex items-center gap-3 text-slate-400">
              <div className="p-2 bg-slate-700/30 rounded-lg text-blue-400">
                {kpi.icon}
              </div>
              <span className="text-sm font-semibold uppercase tracking-wider">{kpi.title}</span>
            </div>
            <div className="text-3xl font-bold mt-1 text-slate-100">
              {kpi.value}
            </div>
            <div className="text-xs text-slate-500 font-medium">
              {kpi.desc}
            </div>
          </div>
        ))}
      </div>

      {/* SEASON EVOLUTION CHART */}
      <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/30">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold">Línea de Vida Táctica (Evolución de Minutos)</h2>
          <div className="text-xs text-slate-400">Las caídas a 0' representan rotación o no convocatoria</div>
        </div>
        
        <div className="h-72 w-full">
          <ResponsiveContainer>
            <LineChart data={evolutionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="matchName" tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} minTickGap={20} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 95]} />
              <RTTooltip 
                contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '12px' }}
                itemStyle={{ fontWeight: 'bold' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }}/>
              <Line 
                type="monotone" 
                dataKey="mediaEquipo" 
                name="Media del Equipo" 
                stroke="#475569" 
                strokeWidth={selectedPlayer === 'TODO' ? 3 : 2} 
                strokeDasharray={selectedPlayer === 'TODO' ? "0" : "5 5"}
                dot={false}
              />
              {selectedPlayer !== 'TODO' && (
                <Line 
                  type="monotone" 
                  dataKey="minutosJugador" 
                  name={`Minutos de ${selectedPlayer.split(' ')[0]}`} 
                  stroke="#3B82F6" 
                  strokeWidth={4}
                  activeDot={{ r: 8, fill: '#60A5FA', stroke: '#0F172A', strokeWidth: 2 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* DEEP STATS TABLE */}
      <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/30 overflow-hidden">
        <h2 className="text-lg font-bold mb-4">Métricas Brutas de Escuadra</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-700/50 text-slate-400">
                <th className="pb-3 font-medium">Dorsal</th>
                <th className="pb-3 font-medium">Jugador</th>
                <th className="pb-3 font-medium text-right">Mins. Tot.</th>
                <th className="pb-3 font-medium text-center">Titularidades</th>
                <th className="pb-3 font-medium text-center">% Titular</th>
                <th className="pb-3 font-medium text-right">Med/PJ</th>
              </tr>
            </thead>
            <tbody>
              {teamStats.map((p, idx) => (
                <tr 
                  key={p.name} 
                  className={`border-b last:border-0 border-slate-700/30 transition-colors 
                    ${playerFocus?.name === p.name ? 'bg-blue-900/20' : 'hover:bg-slate-800/60'}
                  `}
                >
                  <td className="py-3 items-center">
                    <span className="w-8 h-8 flex items-center justify-center bg-slate-700/50 rounded-full text-xs font-bold text-slate-300">
                      {p.dorsal}
                    </span>
                  </td>
                  <td className="py-3 font-semibold text-slate-200">{p.name}</td>
                  <td className="py-3 text-right font-bold text-blue-400">{p.minutos}'</td>
                  <td className="py-3 text-center">{p.titularidades} / {p.partidosConvocado}</td>
                  <td className="py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{width: `${p.porcentajeTitular}%`}}></div>
                      </div>
                      <span className="text-xs text-slate-400 w-8">{p.porcentajeTitular}%</span>
                    </div>
                  </td>
                  <td className="py-3 text-right">{p.minutosPorPartido}'</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
