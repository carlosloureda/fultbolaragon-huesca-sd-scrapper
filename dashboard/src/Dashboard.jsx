import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, CartesianGrid
} from 'recharts';
import { Activity, Play, CalendarDays, Award } from 'lucide-react';
import './Dashboard.css';

const Dashboard = ({ data, targetPlayer }) => {
  const { matches = [], players = [] } = data;
  const [activeTab, setActiveTab] = useState('team');

  // AGGREGATE TEAM STATS
  const teamStats = useMemo(() => {
    const stats = {};
    players.forEach(p => {
      if (!stats[p.Jugador]) {
        stats[p.Jugador] = {
          name: p.Jugador,
          minutos: 0,
          partidosJugados: 0,
          titularidades: 0,
          vecesSuplente: 0,
          dorsal: p.Dorsal
        };
      }
      stats[p.Jugador].minutos += p["Minutos Jugados"] || 0;
      stats[p.Jugador].titularidades += p["Titularidad_num"] || 0;
      if (p["Jugó"] === "Sí") stats[p.Jugador].partidosJugados += 1;
      if (p["Suplente Usado"] === "Sí") stats[p.Jugador].vecesSuplente += 1;
    });

    return Object.values(stats)
      .filter(p => p.minutos > 0)
      .sort((a, b) => b.minutos - a.minutos);
  }, [players]);

  // TARGET PLAYER STATS
  const playerLogs = useMemo(() => {
    if (!targetPlayer) return [];
    return players
      .filter(p => p.Jugador.toLowerCase().includes(targetPlayer.toLowerCase().split(' ')[0]))
      .map(p => ({
        partido: p.Partido.split(' vs ')[1] || p.Partido, // Simplify name
        minutos: p["Minutos Jugados"],
        titular: p["Titular"] === "Sí" ? 1 : 0
      }));
  }, [players, targetPlayer]);

  const playerTargetStats = teamStats.find(p => p.name.toLowerCase().includes(targetPlayer.toLowerCase().split(' ')[0])) || {};

  return (
    <div className="dashboard">
      <div className="tabs">
        <button 
          className={activeTab === 'team' ? 'active' : ''} 
          onClick={() => setActiveTab('team')}
        >
          Resumen Plantilla
        </button>
        <button 
          className={activeTab === 'player' ? 'active' : ''} 
          onClick={() => setActiveTab('player')}
        >
          Jugador: {targetPlayer}
        </button>
      </div>

      {activeTab === 'team' && (
        <div className="tab-content fade-in">
          <div className="summary-cards">
            <div className="card stat-card">
              <Award className="icon text-yellow" />
              <div>
                <h4>Total Jugadores</h4>
                <span>{teamStats.length}</span>
              </div>
            </div>
            <div className="card stat-card">
              <CalendarDays className="icon text-blue" />
              <div>
                <h4>Partidos Computados</h4>
                <span>{matches.length}</span>
              </div>
            </div>
          </div>

          <div className="card chart-container">
            <h3>Minutos Jugados por Plantilla (Ranking)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={teamStats} margin={{ top: 20, right: 30, left: 0, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} tick={{fontSize: 10, fill: '#aaa'}}/>
                <YAxis />
                <Tooltip cursor={{fill: 'rgba(255, 255, 255, 0.1)'}} contentStyle={{backgroundColor: '#1E293B', border: 'none', borderRadius: '8px'}}/>
                <Bar dataKey="minutos" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Minutos" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card table-container">
            <h3>Plantilla Completa</h3>
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Dorsal</th>
                  <th>Jugador</th>
                  <th>Partidos</th>
                  <th>Titular</th>
                  <th>Minutos</th>
                  <th>Media (Min/PJ)</th>
                </tr>
              </thead>
              <tbody>
                {teamStats.map(p => (
                  <tr key={p.name}>
                    <td><span className="badge-dorsal">{p.dorsal || '-'}</span></td>
                    <td className="text-left font-bold">{p.name}</td>
                    <td>{p.partidosJugados}</td>
                    <td>{p.titularidades}</td>
                    <td className="text-blue font-bold">{p.minutos}</td>
                    <td>{p.partidosJugados > 0 ? (p.minutos / p.partidosJugados).toFixed(1) : 0}'</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'player' && (
        <div className="tab-content fade-in">
          <div className="player-header card">
            <h2>{playerTargetStats.name || targetPlayer}</h2>
            <div className="player-badges">
              <span className="badge">Dorsal {playerTargetStats.dorsal || '?'}</span>
              <span className="badge highlight">{playerTargetStats.minutos} Minutos Totales</span>
            </div>
          </div>

          <div className="summary-cards">
            <div className="card stat-card">
              <Play className="icon text-green" />
              <div>
                <h4>Partidos Jugados</h4>
                <span>{playerTargetStats.partidosJugados || 0}</span>
              </div>
            </div>
            <div className="card stat-card">
              <Award className="icon text-yellow" />
              <div>
                <h4>Titularidades</h4>
                <span>{playerTargetStats.titularidades || 0}</span>
              </div>
            </div>
            <div className="card stat-card">
              <Activity className="icon text-blue" />
              <div>
                <h4>Media Min/Partido</h4>
                <span>
                  {playerTargetStats.partidosJugados > 0 
                    ? (playerTargetStats.minutos / playerTargetStats.partidosJugados).toFixed(1) 
                    : 0}'
                </span>
              </div>
            </div>
          </div>

          <div className="card chart-container">
            <h3>Evolución de Minutos por Jornada</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={playerLogs} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="partido" tick={{fontSize: 10, fill: '#aaa'}} />
                <YAxis domain={[0, 95]} />
                <Tooltip contentStyle={{backgroundColor: '#1E293B', border: 'none', borderRadius: '8px'}}/>
                <Legend />
                <Line type="monotone" dataKey="minutos" stroke="#10B981" strokeWidth={3} activeDot={{ r: 8 }} name="Minutos Jugados" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
