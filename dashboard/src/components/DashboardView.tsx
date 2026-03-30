import { useState, useMemo } from 'react';
import type { Dataset, PlayerAggregatedStats } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTTooltip, ResponsiveContainer, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Users, Activity, ChevronDown, ChevronUp, Swords, Search, LayoutGrid, List } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...classes: (string | undefined | null | false)[]) {
  return twMerge(clsx(classes));
}

// Custom Searchable Select
function SearchableSelect({ options, value, onChange, placeholder, icon: Icon }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  const filtered = options.filter((o: any) => o.label.toLowerCase().includes(search.toLowerCase()));
  const selectedLabel = options.find((o: any) => o.value === value)?.label || placeholder;

  return (
    <div className="relative w-full">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer hover:border-slate-500 transition-colors"
      >
        <div className="flex items-center gap-2 truncate">
          {Icon && <Icon className="w-4 h-4 text-slate-400" />}
          <span className="truncate">{selectedLabel}</span>
        </div>
        <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", isOpen && "rotate-180")} />
      </div>
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
          <div className="p-2 border-b border-slate-700 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 ml-2" />
            <input 
              autoFocus 
              type="text" 
              className="w-full bg-transparent border-none text-sm text-slate-200 focus:outline-none focus:ring-0 p-1" 
              placeholder="Buscar..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filtered.map((o: any) => (
              <div 
                key={o.value} 
                onClick={() => { onChange(o.value); setIsOpen(false); setSearch(''); }}
                className={cn("px-4 py-2 cursor-pointer text-sm hover:bg-slate-700 text-slate-200 transition-colors", value === o.value && "bg-blue-900/50 text-blue-200")}
              >
                {o.label}
              </div>
            ))}
            {filtered.length === 0 && <div className="p-4 text-center text-slate-500 text-sm">Sin resultados</div>}
          </div>
        </div>
      )}
    </div>
  );
}

type SortConfig = { key: keyof PlayerAggregatedStats | 'goles' | 'asistencias' | 'posicion'; direction: 'asc' | 'desc' };

export default function DashboardView({ dataset, teamStats: initialTeamStats }: { dataset: Dataset, teamStats: PlayerAggregatedStats[] }) {
  const [selectedPlayer, setSelectedPlayer] = useState<string>('TODO');
  const [vsPlayer, setVsPlayer] = useState<string>('NONE');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'minutos', direction: 'desc' });
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [cardsFilter, setCardsFilter] = useState<string>('ALL');

  const { matches, players } = dataset;

  // Enrich initialTeamStats with Mocks for Goals, Assists, Position until Scraper provides them
  const enrichedTeamStats = useMemo(() => {
    return initialTeamStats.map(p => {
      // Find a raw log for this player to extract their Posición, Goles, Asistencias
      const logs = players.filter(l => l.Jugador === p.name);
      
      return {
        ...p,
        goles: logs.reduce((acc, log) => acc + (log.Goles || 0), 0),
        asistencias: logs.reduce((acc, log) => acc + (log.Asistencias || 0), 0),
        posicion: logs[0]?.["Posición"] || 'Por definir'
      };
    });
  }, [initialTeamStats, players]);

  // Sorting
  const teamStats = useMemo(() => {
    const sorted = [...enrichedTeamStats];
    sorted.sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [enrichedTeamStats, sortConfig]);

  const handleSort = (key: SortConfig['key']) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const SortIcon = ({ columnKey }: { columnKey: SortConfig['key'] }) => {
    if (sortConfig.key !== columnKey) return <ChevronDown className="w-4 h-4 text-slate-600 inline" />;
    return sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 text-blue-400 inline" /> : <ChevronDown className="w-4 h-4 text-blue-400 inline" />;
  };

  // GLOBAL CONTEXT CALCS
  const teamAverageMins = useMemo(() => {
    if (teamStats.length === 0) return 0;
    const totalMins = teamStats.reduce((acc, curr) => acc + curr.minutos, 0);
    return totalMins / teamStats.length;
  }, [teamStats]);

  const playerFocus = useMemo(() => teamStats.find(p => p.name === selectedPlayer) || null, [selectedPlayer, teamStats]);
  const playerVs = useMemo(() => teamStats.find(p => p.name === vsPlayer) || null, [vsPlayer, teamStats]);

  // PARSE JORNADAS to sort chronologically
  const parsedMatches = useMemo(() => {
    return matches.map(m => {
      const title = m["Jornada/Fecha"] || "";
      const jMatch = title.match(/Jornada (\d+)/i);
      const jNumber = jMatch ? parseInt(jMatch[1], 10) : 0;
      return { ...m, jNumber, label: `J${jNumber}: ${m.Rival}` };
    }).sort((a, b) => a.jNumber - b.jNumber);
  }, [matches]);

  // RADAR PROFILE DATA
  const radarData = useMemo(() => {
    if (!playerFocus) return [];
    const maxMins = Math.max(...teamStats.map(p => p.minutos), 1);
    const maxTits = Math.max(...teamStats.map(p => p.titularidades), 1);
    const maxGols = Math.max(...teamStats.map(p => p.goles), 1);
    const maxAsts = Math.max(...teamStats.map(p => p.asistencias), 1);

    const teamAvgMins = teamStats.reduce((a,b)=>a+b.minutos,0)/teamStats.length;
    const teamAvgTits = teamStats.reduce((a,b)=>a+b.titularidades,0)/teamStats.length;
    const teamAvgGols = teamStats.reduce((a,b)=>a+b.goles,0)/teamStats.length;
    const teamAvgAsts = teamStats.reduce((a,b)=>a+b.asistencias,0)/teamStats.length;

    return [
      { subject: 'Minutos', A: Math.round((playerFocus.minutos/maxMins)*100), B: Math.round((teamAvgMins/maxMins)*100) },
      { subject: 'Titularidad', A: Math.round((playerFocus.titularidades/maxTits)*100), B: Math.round((teamAvgTits/maxTits)*100) },
      { subject: 'Goles', A: Math.round((playerFocus.goles/maxGols)*100), B: Math.round((teamAvgGols/maxGols)*100) },
      { subject: 'Asistencias', A: Math.round((playerFocus.asistencias/maxAsts)*100), B: Math.round((teamAvgAsts/maxAsts)*100) },
      { subject: 'Confianza', A: Math.round((playerFocus.partidosJugados/Math.max(matches.length,1))*100), B: Math.round(((teamStats.reduce((a,b)=>a+b.partidosJugados,0)/teamStats.length)/matches.length)*100) },
    ];
  }, [playerFocus, teamStats, matches]);
  const evolutionData = useMemo(() => {
    return parsedMatches.map(match => {
      const dataPoint: any = { matchName: match.label, jNumber: match.jNumber };

      // Base: The Team average for this specific match.
      const matchLogs = players.filter(p => p.Partido === match.Partido && p["Minutos Jugados"] > 0);
      const avgMins = matchLogs.length > 0 ? matchLogs.reduce((acc, curr) => acc + curr["Minutos Jugados"], 0) / matchLogs.length : 0;
      dataPoint.mediaEquipo = Math.round(avgMins);

      if (playerFocus) {
        const entry = matchLogs.find(p => p.Jugador === playerFocus.name);
        dataPoint.minutosJugador1 = entry ? entry["Minutos Jugados"] : 0;
      }
      if (playerVs) {
        const entry = matchLogs.find(p => p.Jugador === playerVs.name);
        dataPoint.minutosJugador2 = entry ? entry["Minutos Jugados"] : 0;
      }
      return dataPoint;
    });
  }, [parsedMatches, players, playerFocus, playerVs]);

  const sortedOptions = useMemo(() => {
    const opts = enrichedTeamStats.map(p => ({ value: p.name, label: `${p.name} (${p.dorsal})` }));
    return opts.sort((a, b) => a.label.localeCompare(b.label));
  }, [enrichedTeamStats]);

  const mainSelectOptions = [
    { value: 'TODO', label: '🌐 Visión Global (Plantilla completa)' },
    ...sortedOptions
  ];

  const vsSelectOptions = [
    { value: 'NONE', label: 'Sin comparativa (Modo Foco)' },
    ...sortedOptions.filter(o => o.value !== selectedPlayer)
  ];

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8 max-w-7xl mx-auto">
      {/* GLOBAL CONTROLS HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-800/80 p-6 rounded-2xl border border-slate-700/50 shadow-xl backdrop-blur-md">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl lg:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-emerald-400 to-teal-400">
            Huesca SD - TactiCenter
          </h1>
          <p className="text-slate-400 font-medium">Análisis Táctico y de Rotaciones Oficial - Selección de Análisis Avanzado</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto z-50 relative">
          {/* Main Player */}
          <div className="w-full sm:w-72">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">Análisis Ppal.</label>
            <SearchableSelect 
              options={mainSelectOptions}
              value={selectedPlayer}
              onChange={(val: string) => {
                setSelectedPlayer(val);
                if (val === 'TODO') setVsPlayer('NONE');
              }}
              placeholder="Buscar jugador..."
            />
          </div>

          {/* V/S Player */}
          {selectedPlayer !== 'TODO' && (
            <div className="w-full sm:w-72 animate-in fade-in slide-in-from-left-4 z-40 relative">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1 flex items-center gap-1">
                Comparativa Paralela
              </label>
              <SearchableSelect 
                options={vsSelectOptions}
                value={vsPlayer}
                onChange={setVsPlayer}
                placeholder="Contra quién..."
                icon={Swords}
              />
            </div>
          )}
        </div>
      </div>

      {/* VS COMPARISON CARDS / TEAM KPIs */}
      {selectedPlayer === 'TODO' ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/30 flex flex-col gap-2">
            <span className="text-sm font-semibold uppercase tracking-wider text-slate-400">Total Plantilla</span>
            <div className="text-4xl font-bold text-slate-100">{teamStats.length}</div>
            <span className="text-xs text-slate-500">Jugadores evaluados</span>
          </div>
          <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/30 flex flex-col gap-2">
            <span className="text-sm font-semibold uppercase tracking-wider text-slate-400">Partidos Activos</span>
            <div className="text-4xl font-bold text-slate-100">{matches.length}</div>
            <span className="text-xs text-slate-500">Base de datos</span>
          </div>
          <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/30 flex flex-col gap-2">
            <span className="text-sm font-semibold uppercase tracking-wider text-slate-400">Promedio Mins.</span>
            <div className="text-4xl font-bold text-slate-100">{Math.round(teamAverageMins)}'</div>
            <span className="text-xs text-slate-500">Por jugador activo</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Player 1 Card */}
          {playerFocus && (
            <div className="bg-gradient-to-br from-blue-900/40 to-slate-900 border border-blue-800/50 p-6 rounded-2xl flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-blue-100">{playerFocus.name}</h2>
                  <span className="text-blue-400 text-sm font-medium tracking-widest uppercase">{playerFocus.posicion} • Dorsal {playerFocus.dorsal}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50 text-center">
                  <div className="text-2xl font-black text-slate-100">{playerFocus.minutos}'</div>
                  <div className="text-xs text-slate-400 mt-1 uppercase">Mins</div>
                </div>
                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50 text-center">
                  <div className="text-2xl font-black text-slate-100">{playerFocus.titularidades}</div>
                  <div className="text-xs text-slate-400 mt-1 uppercase">Titular</div>
                </div>
                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50 text-center">
                  <div className="text-2xl font-black text-slate-100">{playerFocus.goles}</div>
                  <div className="text-xs text-slate-400 mt-1 uppercase">Goles</div>
                </div>
              </div>
            </div>
          )}

          {/* Player 2 Card */}
          {playerVs && (
            <div className="bg-gradient-to-br from-red-900/20 to-slate-900 border border-red-800/30 p-6 rounded-2xl flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-red-100">{playerVs.name}</h2>
                  <span className="text-red-400 text-sm font-medium tracking-widest uppercase">{playerVs.posicion} • Dorsal {playerVs.dorsal}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50 text-center">
                  <div className="text-2xl font-black text-slate-100">{playerVs.minutos}'</div>
                  <div className="text-xs text-slate-400 mt-1 uppercase">Mins</div>
                </div>
                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50 text-center">
                  <div className="text-2xl font-black text-slate-100">{playerVs.titularidades}</div>
                  <div className="text-xs text-slate-400 mt-1 uppercase">Titular</div>
                </div>
                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50 text-center">
                  <div className="text-2xl font-black text-slate-100">{playerVs.goles}</div>
                  <div className="text-xs text-slate-400 mt-1 uppercase">Goles</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CHARTS LAYER */}
      {!playerFocus ? (
        <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/30 shadow-lg">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
             <Activity className="text-emerald-400" /> Tensión Táctica y Rotaciones
          </h2>
          <div className="h-[400px] w-full">
            <ResponsiveContainer>
              <LineChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} vertical={false} />
                <XAxis dataKey="matchName" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={20} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 95]} />
                <RTTooltip contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '12px' }} />
                <Legend wrapperStyle={{ paddingTop: '20px' }}/>
                <Line type="monotone" dataKey="mediaEquipo" name="Media Mins. Equipo" stroke="#64748b" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* RADAR CHART */}
           <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/30 shadow-lg flex flex-col">
             <h2 className="text-xl font-bold text-center mb-2">Perfil Base vs Equipo (Percentiles)</h2>
             <div className="h-[300px] w-full">
               <ResponsiveContainer>
                 <RadarChart outerRadius={90} data={radarData}>
                   <PolarGrid stroke="#334155" />
                   <PolarAngleAxis dataKey="subject" tick={{ fill: '#94A3B8', fontSize: 12 }} />
                   <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                   <Radar name={playerFocus.name} dataKey="A" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.5} />
                   <Radar name="Media Equipo" dataKey="B" stroke="#64748B" fill="#64748B" fillOpacity={0.2} />
                   <Legend />
                   <RTTooltip contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #1E293B', borderRadius: '12px' }} />
                 </RadarChart>
               </ResponsiveContainer>
             </div>
           </div>

           {/* CONTINUITY HEATMAP */}
           <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/30 shadow-lg flex flex-col justify-center">
             <h2 className="text-xl font-bold mb-4">Mosaico de Continuidad</h2>
             <div className="flex flex-wrap gap-2 justify-center">
               {evolutionData.map((d, i) => {
                  let intensity = 'bg-slate-800 border-slate-700'; // Missing/0
                  const mins = d.minutosJugador1 || 0;
                  if (mins > 75) intensity = 'bg-emerald-500 border-emerald-400';
                  else if (mins > 45) intensity = 'bg-emerald-400/80 border-emerald-300/80';
                  else if (mins > 15) intensity = 'bg-yellow-500 border-yellow-400';
                  else if (mins > 0) intensity = 'bg-orange-500 border-orange-400';
                  
                  return (
                    <div key={i} className="flex flex-col items-center group relative gap-1">
                      <div className={cn("w-10 h-10 rounded-md border", intensity, "transition-all hover:scale-110")} />
                      <span className="text-[10px] text-slate-500 absolute -bottom-5 w-24 text-center opacity-0 group-hover:opacity-100 bg-slate-900 px-1 py-0.5 rounded shadow z-10 transition-opacity">
                        {d.matchName} <br/> {mins} mins
                      </span>
                    </div>
                  )
               })}
             </div>
             
             <div className="mt-8 flex items-center justify-center gap-4 text-xs font-medium text-slate-400">
               <div className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-500 rounded-sm"></div> Titular Fijo</div>
               <div className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-400/80 rounded-sm"></div> &gt;45m</div>
               <div className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-500 rounded-sm"></div> Revulsivo</div>
               <div className="flex items-center gap-1"><div className="w-3 h-3 bg-slate-800 border border-slate-700 rounded-sm"></div> Banquillo/No Convocado</div>
             </div>
           </div>
        </div>
      )}

      {/* ADVANCED DATA VIEW */}
      {selectedPlayer === "TODO" && (
        <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/30 overflow-hidden shadow-lg flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Users className="text-blue-400" /> Plantilla General ({teamStats.length})
            </h2>
            
            <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700/50">
              <button onClick={() => setViewMode('table')} className={cn("px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2", viewMode === 'table' ? "bg-slate-700 text-white shadow" : "text-slate-400 hover:text-slate-200")}>
                <List className="w-4 h-4"/> Tabla
              </button>
              <button onClick={() => setViewMode('cards')} className={cn("px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2", viewMode === 'cards' ? "bg-slate-700 text-white shadow" : "text-slate-400 hover:text-slate-200")}>
                <LayoutGrid className="w-4 h-4"/> Tarjetas
              </button>
            </div>
          </div>
          
          {viewMode === 'table' ? (
            <div className="overflow-x-auto">
              {/* Note: Click headers to sort */}
              <table className="w-full text-left whitespace-nowrap">
                {/* Headers */}
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 uppercase text-xs tracking-wider">
                    <th className="pb-4 pt-2 font-bold cursor-pointer hover:text-blue-400" onClick={() => handleSort('dorsal')}>Dorsal <SortIcon columnKey="dorsal"/></th>
                    <th className="pb-4 pt-2 font-bold cursor-pointer hover:text-blue-400" onClick={() => handleSort('name')}>Jugador <SortIcon columnKey="name"/></th>
                    <th className="pb-4 pt-2 font-bold cursor-pointer hover:text-blue-400" onClick={() => handleSort('posicion')}>Posición <SortIcon columnKey="posicion"/></th>
                    <th className="pb-4 pt-2 font-bold cursor-pointer hover:text-blue-400 text-right" onClick={() => handleSort('minutos')}>Minutos <SortIcon columnKey="minutos"/></th>
                    <th className="pb-4 pt-2 font-bold cursor-pointer hover:text-blue-400 text-center" onClick={() => handleSort('titularidades')}>Titular <SortIcon columnKey="titularidades"/></th>
                    <th className="pb-4 pt-2 font-bold cursor-pointer hover:text-blue-400 text-center" onClick={() => handleSort('porcentajeTitular')}>Ratio Tit. <SortIcon columnKey="porcentajeTitular"/></th>
                    <th className="pb-4 pt-2 font-bold cursor-pointer hover:text-blue-400 text-center" onClick={() => handleSort('goles')}>Goles <SortIcon columnKey="goles"/></th>
                  </tr>
                </thead>
                <tbody>
                  {teamStats.map((p) => (
                    <tr key={p.name} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                      <td className="py-4">
                        <span className="w-8 h-8 flex items-center justify-center bg-slate-900 border border-slate-700 rounded-lg text-sm font-bold text-slate-300">
                          {p.dorsal}
                        </span>
                      </td>
                      <td className="py-4 font-semibold text-slate-200">{p.name}</td>
                      <td className="py-4 text-slate-400">{p.posicion}</td>
                      <td className="py-4 text-right font-bold text-blue-400 text-lg">{p.minutos}'</td>
                      <td className="py-4 text-center text-slate-300">{p.titularidades}</td>
                      <td className="py-4 text-center">
                        <div className="flex items-center justify-center gap-3">
                          <div className="w-20 h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div className={cn("h-full rounded-full transition-all", p.porcentajeTitular > 60 ? "bg-emerald-500" : p.porcentajeTitular > 30 ? "bg-yellow-500" : "bg-red-500")} style={{width: `${p.porcentajeTitular}%`}}></div>
                          </div>
                          <span className="text-xs text-slate-400 w-8">{p.porcentajeTitular}%</span>
                        </div>
                      </td>
                      <td className="py-4 font-bold text-center text-emerald-400">{p.goles > 0 ? p.goles : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button onClick={()=>setCardsFilter('ALL')} className={cn("px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap", cardsFilter==='ALL'?"bg-blue-600 text-white":"bg-slate-800 text-slate-400 hover:bg-slate-700")}>Todos</button>
                {Array.from(new Set(teamStats.map(p=>p.posicion))).map(pos => (
                  <button key={pos} onClick={()=>setCardsFilter(pos)} className={cn("px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap", cardsFilter===pos?"bg-blue-600 text-white":"bg-slate-800 text-slate-400 hover:bg-slate-700")}>{pos}</button>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {teamStats.filter(p => cardsFilter === 'ALL' || p.posicion === cardsFilter).map(p => (
                   <div key={p.name} onClick={() => setSelectedPlayer(p.name)} className="bg-slate-800/80 border border-slate-700 hover:border-blue-500/50 hover:bg-slate-800 cursor-pointer p-5 rounded-2xl transition-all flex flex-col gap-4 shadow-sm group">
                     <div className="flex justify-between items-start">
                       <div className="flex-1">
                         <h3 className="font-bold text-slate-100 group-hover:text-blue-400 transition-colors leading-tight">{p.name}</h3>
                         <div className="text-xs font-medium tracking-wider text-slate-500 uppercase mt-1">{p.posicion}</div>
                       </div>
                       <div className="text-2xl font-black text-slate-700 ml-2">#{p.dorsal}</div>
                     </div>
                     <div className="grid grid-cols-2 gap-2 mt-auto">
                        <div className="bg-slate-900/50 p-2 rounded-lg text-center flex flex-col justify-center border border-slate-700/50">
                          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Minutos</span>
                          <span className="text-lg font-black text-blue-400">{p.minutos}'</span>
                        </div>
                        <div className="bg-slate-900/50 p-2 rounded-lg text-center flex flex-col justify-center border border-slate-700/50">
                          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Titular</span>
                          <span className="text-lg font-black text-slate-200">{p.titularidades} <span className="text-[10px] font-normal text-slate-500">P.</span></span>
                        </div>
                        <div className="bg-slate-900/50 p-2 rounded-lg text-center flex flex-col justify-center border border-slate-700/50 col-span-2">
                          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Goles OFICIALES</span>
                          <span className="text-xl font-black text-emerald-400">{p.goles}</span>
                        </div>
                     </div>
                     <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden mt-1 relative">
                        <div className={cn("absolute left-0 top-0 h-full", p.porcentajeTitular > 65 ? "bg-emerald-500" : p.porcentajeTitular > 30 ? "bg-yellow-500" : "bg-red-500")} style={{width: `${p.porcentajeTitular}%`}}></div>
                     </div>
                   </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
