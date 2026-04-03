import { useState, useMemo, useEffect, useRef } from 'react';
import type { Dataset, PlayerAggregatedStats } from '../types';
import { 
  Swords as SwordsIcon, 
  Trophy as TrophyIcon, 
  Activity as ActivityIcon, 
  Users as UsersIcon, 
  Search as SearchIcon, 
  ChevronDown as ChevronDownIcon, 
  Zap as ZapIcon,
  ChevronLeft as ChevronLeftIcon,
  TrendingUp as TrendingUpIcon,
  CalendarIcon as CalendarIcon,
  FileDown as FileDownIcon,
  ShieldAlert as ShieldAlertIcon,
  X as XIcon,
  Target as TargetIcon
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis
} from 'recharts';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...classes: (string | undefined | null | false)[]) {
  return twMerge(clsx(classes));
}

// 1. STABLE COMPONENTS (OUTSIDE MAIN RENDER)
function SearchableSelect({ options, value, onChange, placeholder, icon: Icon, className }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = options.filter((o: any) => o.label.toLowerCase().includes(search.toLowerCase()));
  const selectedLabel = options.find((o: any) => o.value === value)?.label || placeholder;

  // --- CLICK OUTSIDE LOGIC (V5.2) ---
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [containerRef]);

  return (
    <div className={cn("relative text-left", className)} ref={containerRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer hover:border-slate-500 transition-colors shadow-lg"
      >
        <div className="flex items-center gap-2 truncate">
          {Icon && <Icon className="w-4 h-4 text-slate-400" />}
          <span className="truncate font-bold text-sm tracking-tight">{selectedLabel}</span>
        </div>
        <ChevronDownIcon className={cn("w-4 h-4 text-slate-400 transition-transform duration-300", isOpen && "rotate-180")} />
      </div>
      {isOpen && (
        <div className="absolute z-[100] w-full mt-2 bg-slate-800 border border-slate-700 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-3 border-b border-slate-700 flex items-center gap-2 bg-slate-900/50">
            <SearchIcon className="w-4 h-4 text-slate-500 ml-2" />
            <input 
              autoFocus 
              type="text" 
              className="w-full bg-transparent border-none text-sm text-slate-200 focus:outline-none p-1 font-bold" 
              placeholder="Buscar..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
          <div className="max-h-64 overflow-y-auto custom-scrollbar">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-slate-500 text-xs font-black uppercase italic tracking-widest">Sin resultados</div>
            ) : (
              filtered.map((o: any) => (
                <div key={o.value} onClick={() => { onChange(o.value); setIsOpen(false); setSearch(''); }} className={cn("px-4 py-3 cursor-pointer text-sm hover:bg-slate-700 text-slate-200 transition-colors border-b border-slate-700/30 last:border-0", value === o.value && "bg-emerald-900/50 text-emerald-200")}>
                  {o.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const MIN_MINUTES_FOR_EFFICIENCY = 350;

export default function DashboardView({ dataset, teamStats: initialTeamStats }: { dataset: Dataset, teamStats: PlayerAggregatedStats[] }) {
  // --- NAVIGATION (HASH ROUTING) ---
  const [currentHash, setCurrentHash] = useState(window.location.hash);
  useEffect(() => {
    const handleHash = () => setCurrentHash(window.location.hash);
    window.addEventListener('popstate', handleHash);
    return () => window.removeEventListener('popstate', handleHash);
  }, []);

  const route = useMemo(() => {
    const h = currentHash.replace('#', '');
    if (h.startsWith('player/')) return { type: 'player', id: decodeURIComponent(h.replace('player/', '')) };
    if (h.startsWith('vs/')) {
      const parts = h.replace('vs/', '').split('/');
      return { type: 'vs', id1: decodeURIComponent(parts[0]), id2: decodeURIComponent(parts[1] || 'NONE') };
    }
    return { type: 'home' };
  }, [currentHash]);

  // --- DYNAMIC TITLE & SCROLL (V5.3 - V6.1) ---
  useEffect(() => {
    if (route.type === 'player' && route.id) {
      document.title = `${route.id.split(',')[0]} | SD HUESCA`;
    } else if (route.type === 'vs') {
      document.title = `Comparativa VS | SD HUESCA`;
    } else {
      document.title = `SD HUESCA | DATACENTER`;
    }
    // RESET SCROLL ON NAV (V6.1)
    window.scrollTo(0, 0);
  }, [route]);

  const navigateTo = (path: string) => window.location.hash = path;
  const goHome = () => window.location.hash = '';

  // --- DATA ENRICHMENT ---
  const { players } = dataset;
  
  const enrichedTeamStats = useMemo(() => {
    return initialTeamStats.map(p => {
      const logs = players.filter(l => l.Jugador === p.name);
      const totalGoles = logs.reduce((acc, log) => acc + (log.Goles ?? 0), 0);
      const totalMins = logs.reduce((acc, log) => acc + (log["Minutos Jugados"] ?? 0), 0);
      const subLogs = logs.filter(l => l.Titular === 'No');
      const golesAsSub = subLogs.reduce((acc, log) => acc + (log.Goles ?? 0), 0);
      const efficiency = totalMins > 0 ? (totalGoles / totalMins) * 80 : 0;
      const subEfficiency = subLogs.length > 0 ? (golesAsSub / subLogs.length) : 0;

      return {
        ...p,
        goles: totalGoles,
        minutos: totalMins,
        golesAsSub,
        subEfficiency,
        efficiency,
        amarillas: logs.reduce((acc, log) => acc + (log.Amarillas ?? 0), 0),
        rojas: logs.reduce((acc, log) => acc + (log.Rojas ?? 0), 0),
        posicion: logs[0]?.["Posición"] || '--',
        totalPartidos: logs.length,
        titularidades: logs.filter(l => l.Titular === 'Sí').length,
        pTitularidad: logs.length > 0 ? (logs.filter(l => l.Titular === 'Sí').length / logs.length) * 100 : 0
      };
    });
  }, [initialTeamStats, players]);

  // --- GRID VIEW LOGIC ---
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig] = useState<{key:string, direction:'asc'|'desc'}>({ key: 'goles', direction: 'desc' });
  const [detailModal, setDetailModal] = useState<any>(null);

  const teamStats = useMemo(() => {
    let stats = [...enrichedTeamStats];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      stats = stats.filter(p => p.name.toLowerCase().includes(term) || p.dorsal.toString().includes(term));
    }
    stats.sort((a: any, b: any) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return stats;
  }, [enrichedTeamStats, sortConfig, searchTerm]);

  const sortedUserOptions = useMemo(() => enrichedTeamStats.map(p => ({ value: p.name, label: `${p.name} (#${p.dorsal})` })).sort((a,b)=>a.label.localeCompare(b.label)), [enrichedTeamStats]);

  // --- RENDER MAIN ---
  return (
    <div className="flex flex-col gap-4 md:gap-8 p-3 md:p-8 max-w-7xl mx-auto text-slate-100 font-sans relative">
      {/* GLOBAL HEADER (RESPONSIVE V6.1) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4 bg-slate-900/90 backdrop-blur-xl p-4 md:p-6 rounded-[1.5rem] md:rounded-3xl border-l-[6px] md:border-l-[8px] border-emerald-500 shadow-2xl sticky top-0 md:top-4 z-[60] border border-slate-800/50">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex flex-col gap-0.5 text-left cursor-pointer" onClick={goHome}>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500 text-emerald-950 px-1.5 py-0.5 rounded-[4px] text-[8px] md:text-[10px] font-black uppercase tracking-tighter">SDH</span>
              <h1 className="text-xl md:text-3xl font-black tracking-tighter uppercase italic leading-none">DATA<span className="text-emerald-400">CENTER</span></h1>
            </div>
            <p className="text-slate-500 text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] mt-0.5">SCOUTING V6.3</p>
          </div>
          <div className="md:hidden">
            <a 
              href="/futbolaragon_data.xlsx" 
              download={`stats_huesca_${new Date().toISOString().split('T')[0]}.xlsx`} 
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl border border-slate-700/50 shadow-lg flex items-center justify-center active:scale-95 transition-transform gap-2"
            >
              <FileDownIcon className="w-5 h-5" />
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-100">Excel</span>
            </a>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto z-50">
          <a href="/futbolaragon_data.xlsx" download={`stats_huesca_${new Date().toISOString().split('T')[0]}.xlsx`} className="hidden md:flex items-center justify-center gap-2 px-5 py-3 bg-slate-800/80 hover:bg-slate-700 text-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-700/50 hover:border-emerald-500/30">
            <FileDownIcon className="w-4 h-4 text-emerald-400" /> Descargar Excel
          </a>
          <div className="w-full md:w-64">
            <SearchableSelect 
              options={[{ value: 'TODO', label: '📊 VISTA GENERAL' }, ...sortedUserOptions]}
              value={route.type === 'player' ? route.id : 'TODO'}
              onChange={(val: string) => val === 'TODO' ? goHome() : navigateTo(`player/${val}`)}
              placeholder="Ir a jugador..."
              icon={UsersIcon}
            />
          </div>
        </div>
      </div>

      {/* DYNAMIC VIEW ROUTING */}
      {route.type === 'home' && (
        <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4">
           {/* Hall of Fame Widgets */}
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div onClick={() => setDetailModal({ title: 'Pichichi del Equipo', subtitle: 'Goles totales acumulados', players: [...enrichedTeamStats].sort((a,b)=>b.goles-a.goles).slice(0,15), metricKey: 'goles' })} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl hover:border-emerald-500/50 transition-all cursor-pointer shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"/><div className="flex items-center gap-2 mb-4"><TrophyIcon className="w-4 h-4 text-emerald-400" /><h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Pichichi</h3></div>
                <div className="space-y-3">
                  {[...enrichedTeamStats].sort((a,b)=>b.goles-a.goles).slice(0,3).map((p,i)=>(
                    <div key={p.name} className="flex justify-between text-xs font-bold text-slate-100 pr-2"><span>{i+1}. {p.name}</span><span className="font-black">{p.goles}</span></div>
                  ))}
                </div>
                <p className="mt-4 text-[9px] text-slate-600 font-bold uppercase text-right group-hover:text-emerald-400 transition-colors">Ranking completo →</p>
              </div>
              <div onClick={() => setDetailModal({ title: 'Efectividad Máxima', subtitle: 'Goles por 80 min (Mín. 350 min)', players: [...enrichedTeamStats].filter(p => p.minutos >= MIN_MINUTES_FOR_EFFICIENCY).sort((a,b)=>b.efficiency-a.efficiency).slice(0,15), metricKey: 'efficiency' })} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl hover:border-blue-500/50 transition-all cursor-pointer shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"/><div className="flex items-center gap-2 mb-4"><ZapIcon className="w-4 h-4 text-blue-400" /><h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Factor X</h3></div>
                <div className="space-y-3">
                  {[...enrichedTeamStats].filter(p => p.minutos >= MIN_MINUTES_FOR_EFFICIENCY).sort((a,b)=>b.efficiency-a.efficiency).slice(0,3).map((p,i)=>(
                    <div key={p.name} className="flex justify-between text-xs font-bold text-slate-100 pr-2"><span>{i+1}. {p.name}</span><span className="font-black text-blue-400">{p.efficiency.toFixed(2)}</span></div>
                  ))}
                </div>
                <p className="mt-4 text-[9px] text-slate-600 font-bold uppercase text-right group-hover:text-blue-400 transition-colors">Top Eficiencia →</p>
              </div>
              <div onClick={() => setDetailModal({ title: 'Impacto Revulsivo', subtitle: 'Goles por partido como suplente', players: [...enrichedTeamStats].filter(p=>(p.vecesSuplente||0)>0).sort((a,b)=>b.subEfficiency-a.subEfficiency).slice(0,15), metricKey: 'subEfficiency' })} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl hover:border-orange-500/50 transition-all cursor-pointer shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-orange-500"/><div className="flex items-center gap-2 mb-4"><SwordsIcon className="w-4 h-4 text-orange-400" /><h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Suplente Oro</h3></div>
                <div className="space-y-3">
                  {[...enrichedTeamStats].filter(p=>(p.vecesSuplente||0)>0).sort((a,b)=>b.subEfficiency-a.subEfficiency).slice(0,3).map((p,i)=>(
                    <div key={p.name} className="flex justify-between text-xs font-bold text-slate-100 pr-2"><span>{i+1}. {p.name}</span><span className="font-black text-orange-400">{p.subEfficiency.toFixed(2)}</span></div>
                  ))}
                </div>
                <p className="mt-4 text-[9px] text-slate-600 font-bold uppercase text-right group-hover:text-orange-400 transition-colors">Ver Impacto →</p>
              </div>
              <div onClick={() => setDetailModal({ title: 'Los Intocables', subtitle: 'Minutos totales jugados', players: [...enrichedTeamStats].sort((a,b)=>b.minutos-a.minutos).slice(0,15), metricKey: 'minutos' })} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl hover:border-slate-500 transition-all cursor-pointer shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-slate-500"/><div className="flex items-center gap-2 mb-4"><ActivityIcon className="w-4 h-4 text-slate-400" /><h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Presencia</h3></div>
                <div className="space-y-3">
                  {[...enrichedTeamStats].sort((a,b)=>b.minutos-a.minutos).slice(0,3).map((p,i)=>(
                    <div key={p.name} className="flex justify-between text-xs font-bold text-slate-100 pr-2"><span>{i+1}. {p.name}</span><span className="font-black">{p.minutos}'</span></div>
                  ))}
                </div>
                <p className="mt-4 text-[9px] text-slate-600 font-bold uppercase text-right group-hover:text-slate-300 transition-colors">Season Log →</p>
              </div>
           </div>

           <div className="bg-slate-800/20 p-6 rounded-3xl border border-slate-700/30 flex flex-col gap-6 shadow-2xl overflow-hidden backdrop-blur-sm">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div className="flex flex-col gap-2 w-full lg:w-auto text-left">
                  <h2 className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-2 text-slate-200">
                    <UsersIcon className="text-emerald-400 w-6 h-6" /> Plantilla SD Huesca
                  </h2>
                  <div className="relative w-full lg:w-96 group">
                    <SearchIcon className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors", searchTerm ? "text-emerald-400" : "text-slate-500")} />
                    <input type="text" placeholder="Filtrar por nombre o dorsal..." className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl pl-10 pr-12 py-3 text-sm focus:border-emerald-500 outline-none transition-all placeholder:text-slate-700 font-bold" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
                    {searchTerm && (
                      <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-800 rounded-full transition-colors animate-in fade-in scale-in-75">
                        <XIcon className="w-4 h-4 text-slate-400" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 min-h-[400px]">
                {teamStats.length === 0 ? (
                  <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-500 bg-slate-900/50 rounded-[3rem] border border-dashed border-slate-700/50 animate-in fade-in zoom-in-95">
                    <SearchIcon className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-lg font-black uppercase tracking-tighter italic">No se han encontrado jugadores</p>
                    <p className="text-xs font-bold uppercase tracking-widest mt-2 opacity-50">Prueba con otro nombre o dorsal</p>
                    <button onClick={() => setSearchTerm('')} className="mt-6 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Limpiar Filtros</button>
                  </div>
                ) : (
                  teamStats.map((p: any) => (
                    <div key={p.name} onClick={() => navigateTo(`player/${p.name}`)} className="bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 cursor-pointer p-6 rounded-3xl transition-all shadow-xl active:scale-95 group text-left relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <span className="text-6xl font-black italic tracking-tighter text-slate-100">#{p.dorsal}</span>
                      </div>
                      <div className="mb-6 relative z-10">
                        <h3 className="font-black text-slate-100 group-hover:text-emerald-400 transition-colors uppercase tracking-tight text-base truncate">{p.name}</h3>
                        <div className="text-[10px] font-black tracking-[0.2em] text-slate-500 uppercase mt-1">{p.posicion}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 relative z-10">
                         <div className="bg-slate-950/40 p-3 rounded-2xl border border-slate-800/50 text-center"><span className="text-[10px] text-slate-600 uppercase font-black tracking-widest">MINS</span><div className="text-xl font-black text-slate-200">{p.minutos}'</div></div>
                         <div className="bg-emerald-500/5 p-3 rounded-2xl border border-emerald-500/10 text-center"><span className="text-[10px] text-emerald-600 uppercase font-black tracking-widest">GOLS</span><div className="text-xl font-black text-emerald-400">{p.goles || '--'}</div></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
           </div>
        </div>
      )}

      {route.type === 'player' && (() => {
        const stats = enrichedTeamStats.find(p => p.name === route.id);
        const logs = players.filter(l => l.Jugador === route.id);
        const chartData = logs.map((l, i) => ({ label: `J${i+1}`, mins: l["Minutos Jugados"] ?? 0, goles: l.Goles ?? 0 }));

        if (!stats) return <div className="p-20 text-center text-slate-500 font-bold uppercase tracking-widest">Jugador no encontrado</div>;

        return (
          <div className="flex flex-col gap-6 md:gap-8 animate-in slide-in-from-right-10 duration-500 pt-2 md:pt-0">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button onClick={goHome} className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 border border-slate-700 rounded-2xl text-slate-400 hover:text-slate-100 transition-all flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest">
                <ChevronLeftIcon className="w-4 h-4" /> Volver
              </button>
              <div className="hidden sm:block flex-1 h-px bg-slate-800/50"/>
              <button onClick={() => navigateTo(`vs/${route.id}/NONE`)} className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-emerald-950 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20">COMPARAR (VS)</button>
            </div>

            <div className="bg-slate-900 border-l-[8px] md:border-l-[12px] border-emerald-500 p-6 md:p-12 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-8 relative overflow-hidden">
               <div className="absolute top-0 right-0 h-full w-1/2 bg-gradient-to-l from-emerald-500/5 to-transparent pointer-events-none"/>
               <div className="flex flex-col gap-2 md:gap-3 relative z-10 text-left">
                 <div className="flex items-center gap-2 md:gap-3"><span className="text-emerald-400 font-black text-2xl md:text-4xl italic tracking-tighter">#{stats.dorsal}</span><span className="h-6 w-[2px] bg-slate-800"/><span className="text-slate-500 font-black uppercase text-[10px] md:text-sm tracking-[0.2em] md:tracking-[0.3em]">{stats.posicion}</span></div>
                 <h1 className="text-3xl md:text-6xl font-black uppercase tracking-tighter italic text-slate-100 leading-none">{stats.name}</h1>
               </div>
               <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 w-full md:w-auto relative z-10">
                  {[
                    { label: 'Goles', val: stats.goles, color: 'text-emerald-400', sub: 'Temporada' },
                    { label: 'Minutos', val: `${stats.minutos}'`, color: 'text-white', sub: 'Presencia' },
                    { label: 'Titular', val: `${stats.pTitularidad.toFixed(0)}%`, color: 'text-blue-400', sub: `${stats.titularidades} partidos` },
                    { label: 'Efic.', val: stats.efficiency.toFixed(2), color: 'text-orange-400', sub: 'G / 80 min' }
                  ].map(kpi => (
                    <div key={kpi.label} className="bg-slate-950/40 p-3 md:p-5 rounded-2xl md:rounded-3xl border border-slate-800/50 text-center flex-1 backdrop-blur-md">
                       <div className={cn("text-xl md:text-3xl font-black tracking-tighter", kpi.color)}>{kpi.val}</div>
                       <div className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest mt-0.5">{kpi.label}</div>
                    </div>
                  ))}
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
               <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-8 rounded-[2rem] shadow-xl flex flex-col gap-6">
                  <h3 className="text-lg font-black uppercase tracking-tighter italic flex items-center gap-2"><TrendingUpIcon className="text-emerald-400 w-5 h-5"/> Curva de Rendimiento</h3>
                  <div className="h-64 w-full mt-4 pr-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="label" stroke="#475569" fontSize={10} fontWeight="900" axisLine={false} tickLine={false} />
                        <YAxis stroke="#475569" fontSize={10} fontWeight="900" axisLine={false} tickLine={false} unit="'" />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', fontSize: '10px' }} />
                        <Line type="monotone" dataKey="mins" stroke="#10b981" strokeWidth={4} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
               </div>
               <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] shadow-xl flex flex-col gap-6">
                  <h3 className="text-lg font-black uppercase tracking-tighter italic flex items-center gap-2"><ShieldAlertIcon className="text-orange-400 w-5 h-5"/> Disciplina</h3>
                  <div className="flex-1 flex flex-col justify-center gap-8">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-16 bg-yellow-400 rounded-lg flex items-center justify-center text-yellow-950 font-black text-2xl shadow-lg shadow-yellow-400/20">{stats.amarillas}</div>
                       <div className="flex flex-col"><span className="text-sm font-black text-slate-200">Amarillas</span><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sanciones</span></div>
                    </div>
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-16 bg-red-500 rounded-lg flex items-center justify-center text-red-950 font-black text-2xl shadow-lg shadow-red-500/20">{stats.rojas}</div>
                       <div className="flex flex-col"><span className="text-sm font-black text-slate-200">Rojas</span><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Expulsiones</span></div>
                    </div>
                  </div>
               </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-[1.5rem] md:rounded-[2rem] shadow-xl overflow-hidden">
               <div className="p-5 md:p-8 border-b border-slate-800 text-left bg-slate-950/20">
                  <h3 className="text-base md:text-lg font-black uppercase tracking-tighter italic flex items-center gap-2"><CalendarIcon className="text-blue-400 w-5 h-5"/> Log de la Temporada</h3>
               </div>
               <div className="overflow-x-auto custom-scrollbar">
                 <table className="w-full text-left whitespace-nowrap text-xs md:text-sm">
                   <thead className="sticky top-0 z-10 bg-slate-900 shadow-md"><tr className="bg-slate-950 text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest"><th className="px-5 md:px-8 py-3 md:py-4">Jornada</th><th className="px-5 md:px-8 py-3 md:py-4">Rival</th><th className="px-5 md:px-8 py-3 md:py-4 text-center">Rol</th><th className="px-5 md:px-8 py-3 md:py-4 text-center">Mins</th><th className="px-5 md:px-8 py-3 md:py-4 text-center">Gols</th><th className="px-5 md:px-8 py-3 md:py-4 text-center">Tarjetas</th></tr></thead>
                   <tbody className="divide-y divide-slate-800/40">
                     {logs.map((l, i) => (
                       <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                         <td className="px-5 md:px-8 py-4 md:py-5 text-[10px] font-black text-slate-500 italic">J{i+1}</td>
                         <td className="px-5 md:px-8 py-4 md:py-5 font-bold text-slate-200">{l.Rival}</td>
                         <td className="px-5 md:px-8 py-4 md:py-5 text-center"><span className={cn("text-[8px] md:text-[9px] font-black px-1.5 md:px-2 py-0.5 md:py-1 rounded-md uppercase", l.Titular === 'Sí' ? "bg-emerald-950/40 text-emerald-400" : "bg-orange-950/40 text-orange-400")}>{l.Titular === 'Sí' ? 'Titular' : 'Suplente'}</span></td>
                         <td className="px-5 md:px-8 py-4 md:py-5 text-center font-black">{l["Minutos Jugados"] ?? 0}'</td>
                         <td className="px-5 md:px-8 py-4 md:py-5 text-center">{ (l.Goles ?? 0) > 0 ? <span className="bg-emerald-500 text-emerald-950 px-1.5 md:px-2 py-0.5 rounded font-black text-[10px] md:text-xs">{l.Goles}</span> : '--'}</td>
                         <td className="px-5 md:px-8 py-4 md:py-5 text-center"><div className="flex gap-1 justify-center">{(l.Amarillas ?? 0) > 0 && <div className="w-1.5 md:w-2 h-2.5 md:h-3 bg-yellow-400 rounded-sm"/>}{(l.Rojas ?? 0) > 0 && <div className="w-1.5 md:w-2 h-2.5 md:h-3 bg-red-500 rounded-sm"/>}{!(l.Amarillas ?? 0) && !(l.Rojas ?? 0) && '--'}</div></td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          </div>
        );
      })()}

      {route.type === 'vs' && (() => {
        const p1 = enrichedTeamStats.find(p => p.name === route.id1);
        const p2 = enrichedTeamStats.find(p => p.name === route.id2);
        const radarData = (() => {
          if (!p1 || !p2) return [];
          const metrics = [{ name: 'Goles', k: 'goles', m: 5 }, { name: 'Efic.', k: 'efficiency', m: 20 }, { name: 'Mins', k: 'minutos', m: 0.05 }, { name: 'Titular', k: 'pTitularidad', m: 1 }, { name: 'Disciplina', k: 'amarillas', m: -10, b: 100 }];
          return metrics.map(m => ({ subject: m.name, p1: Math.min(100, (p1 as any)[m.k] * m.m + (m.b || 0)), p2: Math.min(100, (p2 as any)[m.k] * m.m + (m.b || 0)) }));
        })();

        return (
          <div className="flex flex-col gap-8 animate-in fade-in text-left">
            <button onClick={() => p1 ? navigateTo(`player/${p1.name}`) : goHome()} className="w-fit px-6 py-3 bg-slate-900 border border-slate-700 rounded-2xl text-slate-400 hover:text-slate-100 transition-all flex items-center gap-2 font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95">
              <ChevronLeftIcon className="w-4 h-4" /> {p1 ? `Volver a ${p1.name.split(',')[0]}` : 'Cancelar'}
            </button>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <div className="flex flex-col gap-4">
                  <SearchableSelect options={sortedUserOptions} value={route.id1} onChange={(v:string) => navigateTo(`vs/${v}/${route.id2}`)} placeholder="Jugador 1..." icon={UsersIcon} />
                  {p1 && <div className="bg-slate-900 border-t-8 border-emerald-500 p-8 rounded-3xl shadow-xl flex justify-between items-center animate-in slide-in-from-left-4"><h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter text-slate-100">{p1.name}</h2><span className="text-emerald-400 font-black text-2xl">#{p1.dorsal}</span></div>}
               </div>
               <div className="flex flex-col gap-4">
                  <SearchableSelect options={sortedUserOptions} value={route.id2 === 'NONE' ? '' : route.id2} onChange={(v:string) => navigateTo(`vs/${route.id1}/${v}`)} placeholder="Seleccionar Oponente..." icon={TargetIcon} />
                  {p2 && <div className="bg-slate-900 border-t-8 border-blue-500 p-8 rounded-3xl shadow-xl flex justify-between items-center animate-in slide-in-from-right-4"><h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter text-slate-100">{p2.name}</h2><span className="text-blue-400 font-black text-2xl">#{p2.dorsal}</span></div>}
                  {!p2 && <div className="flex-1 bg-slate-900/50 border border-dashed border-slate-700 rounded-3xl flex items-center justify-center p-20 text-slate-600 font-black tracking-widest italic animate-pulse">Elige rival</div>}
               </div>
            </div>
            {p1 && p2 && (
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-[3rem] shadow-2xl grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="flex flex-col gap-8 justify-center">
                   <h3 className="text-2xl font-black uppercase tracking-tighter italic text-center lg:text-left">Análisis Enfrentado</h3>
                   <table className="w-full text-sm">
                      <tbody className="divide-y divide-slate-800">
                        {[
                          { l: 'Eficiencia', v1: (p1?.efficiency || 0).toFixed(2), v2: (p2?.efficiency || 0).toFixed(2), w: (p1?.efficiency || 0) > (p2?.efficiency || 0) ? 1 : 2 }, 
                          { l: 'Titularidad', v1: `${(p1?.pTitularidad || 0).toFixed(0)}%`, v2: `${(p2?.pTitularidad || 0).toFixed(0)}%`, w: (p1?.pTitularidad || 0) > (p2?.pTitularidad || 0) ? 1 : 2 }, 
                          { l: 'Sanciones', v1: (p1?.amarillas || 0) + (p1?.rojas || 0), v2: (p2?.amarillas || 0) + (p2?.rojas || 0), w: ((p1?.amarillas || 0) + (p1?.rojas || 0)) < ((p2?.amarillas || 0) + (p2?.rojas || 0)) ? 1 : 2 }
                        ].map(row => (
                          <tr key={row.l} className="group"><td className={cn("py-4 font-black transition-all", row.w === 1 ? "text-emerald-400 text-lg" : "text-slate-600")}>{row.v1}</td><td className="py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">{row.l}</td><td className={cn("py-4 text-right font-black transition-all", row.w === 2 ? "text-blue-400 text-lg" : "text-slate-600")}>{row.v2}</td></tr>
                        ))}
                      </tbody>
                   </table>
                </div>
                <div className="h-96 w-full"><ResponsiveContainer width="100%" height="100%"><RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}><PolarGrid stroke="#334155" /><PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: '900' }} /><Radar name={p1?.name || ''} dataKey="p1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} /><Radar name={p2?.name || ''} dataKey="p2" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} /></RadarChart></ResponsiveContainer></div>
              </div>
            )}
          </div>
        );
      })()}

      {/* MODAL DETALLE (Hall of Fame) */}
      {detailModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 md:p-4 bg-slate-950/95 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-slate-900 border-2 border-slate-800 rounded-[2rem] md:rounded-[3rem] w-[95%] md:w-full max-w-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col scale-in-95">
            <div className="p-6 md:p-10 border-b border-slate-800 bg-slate-900/50 flex justify-between items-start text-left">
              <div className="flex flex-col gap-1 md:gap-2">
                <span className="bg-emerald-500 text-emerald-950 px-1.5 py-0.5 rounded text-[8px] md:text-[9px] font-black uppercase w-fit tracking-tighter">Ranking Oficial</span>
                <h3 className="text-xl md:text-3xl font-black text-slate-100 uppercase tracking-tighter italic">{detailModal.title}</h3>
                <p className="text-slate-500 text-[10px] md:text-xs font-bold">{detailModal.subtitle}</p>
              </div>
              <button onClick={() => setDetailModal(null)} className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-[1rem] bg-slate-800 text-slate-400 hover:text-white transition-all hover:rotate-90">✕</button>
            </div>
            <div className="p-4 md:p-8 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left">
                <thead><tr className="text-[9px] md:text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-800"><th className="pb-4 px-2 md:px-4">Pos</th><th className="pb-4 px-2 md:px-4">Jugador</th><th className="pb-4 px-2 md:px-4 text-right">Métrica</th></tr></thead>
                <tbody className="divide-y divide-slate-800/50">
                  {detailModal.players.map((p:any, i:number) => {
                    let val = p[detailModal.metricKey];
                    if (detailModal.metricKey === 'efficiency' || detailModal.metricKey === 'subEfficiency') val = val.toFixed(2);
                    if (detailModal.metricKey === 'minutos') val = `${val}'`;
                    return (
                      <tr key={p.name} onClick={() => { setDetailModal(null); navigateTo(`player/${p.name}`); }} className="hover:bg-emerald-500/5 transition-all group cursor-pointer text-xs md:text-sm">
                        <td className="py-4 md:py-5 px-2 md:px-4 text-slate-500 font-bold italic">#{i+1}</td>
                        <td className="py-4 md:py-5 px-2 md:px-4 font-black uppercase text-slate-200 group-hover:text-emerald-400 transition-colors truncate max-w-[150px] md:max-w-none">{p.name}</td>
                        <td className="py-4 md:py-5 px-2 md:px-4 text-right font-black text-lg md:text-xl text-slate-100">{val}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
