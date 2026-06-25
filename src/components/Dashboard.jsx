import React, { useState, useEffect, useMemo } from 'react';
import {
  MapPin, TrendingUp, Users, Calendar, Download, Search, Filter,
  BarChart3, Network, Globe, AlertCircle, Eye, EyeOff, Moon, Sun,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const Dashboard = ({ darkMode, toggleDarkMode }) => {
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterAmountRange, setFilterAmountRange] = useState([0, 100000000000]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(null);

  useEffect(() => {
    fetch('/data/news.json')
      .then(r => r.json())
      .then(setData)
      .catch(e => console.error('Data fetch error:', e));
  }, []);

  // ==================== FILTERS & COMPUTED DATA ====================
  const filteredCases = useMemo(() => {
    if (!data) return [];
    return data.cases.filter(c => {
      const matchSearch = searchTerm === '' || 
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.involved_persons.some(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchStatus = filterStatus === 'all' || c.status === filterStatus;
      const matchCategory = filterCategory === 'all' || c.category === filterCategory;
      const matchAmount = c.amount_huf >= filterAmountRange[0] && c.amount_huf <= filterAmountRange[1];
      return matchSearch && matchStatus && matchCategory && matchAmount;
    });
  }, [data, searchTerm, filterStatus, filterCategory, filterAmountRange]);

  const casesByRegion = useMemo(() => {
    if (!data) return {};
    const grouped = {};
    data.cases.forEach(c => {
      grouped[c.region] = (grouped[c.region] || 0) + 1;
    });
    return grouped;
  }, [data]);

  const timelineData = useMemo(() => {
    if (!data) return [];
    const dates = {};
    data.cases.forEach(c => {
      const year = c.date.substring(0, 4);
      dates[year] = (dates[year] || 0) + 1;
    });
    return Object.entries(dates).sort().map(([year, count]) => ({ year, count }));
  }, [data]);

  const categoryData = useMemo(() => {
    if (!data) return [];
    const grouped = {};
    data.cases.forEach(c => {
      grouped[c.category] = (grouped[c.category] || 0) + 1;
    });
    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }, [data]);

  const totalAmount = useMemo(() => {
    if (!data) return 0;
    return data.cases.reduce((sum, c) => sum + c.amount_huf, 0);
  }, [data]);

  const statusDistribution = useMemo(() => {
    if (!data) return {};
    const dist = {};
    data.cases.forEach(c => {
      dist[c.status] = (dist[c.status] || 0) + 1;
    });
    return dist;
  }, [data]);

  // ==================== EXPORT FUNCTIONS ====================
  const exportToCSV = () => {
    if (!data) return;
    const csv = [
      ['ID', 'Cím', 'Kategória', 'Státusz', 'Régió', 'Összeg (HUF)', 'Dátum', 'Forrás', 'Érintett személyek'].join(','),
      ...data.cases.map(c =>
        [
          c.id,
          `"${c.title.replace(/"/g, '""')}"`,
          c.category,
          c.status,
          c.region,
          c.amount_huf,
          c.date,
          c.source,
          `"${c.involved_persons.map(p => p.name).join('; ')}"`,
        ].join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ner-tracker-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    if (!data) return;
    alert('PDF export szükséges: pdfkit vagy jsPDF csomag. Jelenleg CSV export elérhető.');
  };

  // ==================== RENDER FUNCTIONS ====================

  // TAB: OVERVIEW
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          icon={<TrendingUp className="w-6 h-6" />}
          label="Összesen Ügyek"
          value={data?.cases.length || 0}
          color="blue"
        />
        <MetricCard
          icon={<AlertCircle className="w-6 h-6" />}
          label="Aktív Nyomozás"
          value={statusDistribution['investigation'] || 0}
          color="red"
        />
        <MetricCard
          icon={<Users className="w-6 h-6" />}
          label="Érintett Személyek"
          value={data?.cases.reduce((sum, c) => sum + c.involved_persons.length, 0) || 0}
          color="purple"
        />
        <MetricCard
          icon={<BarChart3 className="w-6 h-6" />}
          label="Összes Összeg"
          value={`${(totalAmount / 1000000000).toFixed(1)}B`}
          subtext="HUF"
          color="green"
        />
        <MetricCard
          icon={<MapPin className="w-6 h-6" />}
          label="Érintett Régiók"
          value={Object.keys(casesByRegion).length}
          color="orange"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <div className={`p-6 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" /> Ügyek Kategória szerint
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#444' : '#e5e7eb'} />
              <XAxis dataKey="name" tick={{ fill: darkMode ? '#9ca3af' : '#666' }} />
              <YAxis tick={{ fill: darkMode ? '#9ca3af' : '#666' }} />
              <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', border: `1px solid ${darkMode ? '#444' : '#e5e7eb'}` }} />
              <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Timeline */}
        <div className={`p-6 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" /> Ügyekútvonala (Év)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#444' : '#e5e7eb'} />
              <XAxis dataKey="year" tick={{ fill: darkMode ? '#9ca3af' : '#666' }} />
              <YAxis tick={{ fill: darkMode ? '#9ca3af' : '#666' }} />
              <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', border: `1px solid ${darkMode ? '#444' : '#e5e7eb'}` }} />
              <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Status Distribution */}
        <div className={`p-6 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h3 className="text-lg font-semibold mb-4">Státusz Megoszlása</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={Object.entries(statusDistribution).map(([name, value]) => ({ name, value }))} cx="50%" cy="50%" labelLine={false} label label={{ fill: darkMode ? '#9ca3af' : '#666' }} outerRadius={80} fill="#8884d8" dataKey="value">
                <Cell fill="#3b82f6" />
                <Cell fill="#ef4444" />
                <Cell fill="#10b981" />
                <Cell fill="#f59e0b" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Amount by Category Bubble */}
        <div className={`p-6 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" /> Pénzügyi Megoszlás
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#444' : '#e5e7eb'} />
              <XAxis type="number" dataKey="count" name="Ügyek száma" tick={{ fill: darkMode ? '#9ca3af' : '#666' }} />
              <YAxis type="number" dataKey="total" name="Összeg (Mrd HUF)" tick={{ fill: darkMode ? '#9ca3af' : '#666' }} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', border: `1px solid ${darkMode ? '#444' : '#e5e7eb'}` }} />
              <Scatter name="Kategóriák" data={categoryData.map(cat => ({
                name: cat.name,
                count: data?.cases.filter(c => c.category === cat.name).length || 0,
                total: (data?.cases.filter(c => c.category === cat.name).reduce((s, c) => s + c.amount_huf, 0) / 1000000000) || 0
              }))} fill="#8b5cf6" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Latest Cases */}
      <div className={`p-6 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" /> Legújabb Ügyek
        </h3>
        <div className="space-y-3">
          {data?.cases.slice(-5).reverse().map(c => (
            <div
              key={c.id}
              className={`p-4 rounded-lg border-l-4 cursor-pointer transition ${
                darkMode ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
              }`}
              onClick={() => setSelectedCase(c)}
              style={{ borderLeftColor: getCategoryColor(c.category) }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-sm">{c.title}</p>
                  <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {c.region} • {c.date} • {c.source}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusBadge(c.status)}`}>
                  {getStatusLabel(c.status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // TAB: CASES WITH FILTERS & MAP
  const renderCases = () => (
    <div className="space-y-6">
      {/* Search & Filters */}
      <SearchAndFilters
        darkMode={darkMode}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        filterCategory={filterCategory}
        setFilterCategory={setFilterCategory}
        filterAmountRange={filterAmountRange}
        setFilterAmountRange={setFilterAmountRange}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className={`lg:col-span-2 p-6 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5" /> Ügyek Térképe
          </h3>
          <InteractiveMap cases={filteredCases} selectedRegion={selectedRegion} setSelectedRegion={setSelectedRegion} darkMode={darkMode} />
        </div>

        {/* Cases List */}
        <div className={`p-6 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h3 className="text-lg font-semibold mb-4">
            Ügyek ({filteredCases.length})
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredCases.map(c => (
              <div
                key={c.id}
                className={`p-3 rounded cursor-pointer transition text-sm ${
                  selectedCase?.id === c.id
                    ? darkMode ? 'bg-blue-900 text-white' : 'bg-blue-100 text-blue-900'
                    : darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                }`}
                onClick={() => setSelectedCase(c)}
              >
                <p className="font-semibold truncate">{c.title}</p>
                <p className="text-xs opacity-75">{c.region}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Case Details */}
      {selectedCase && (
        <CaseDetailPanel case={selectedCase} darkMode={darkMode} onClose={() => setSelectedCase(null)} />
      )}
    </div>
  );

  // TAB: INVESTIGATIONS WITH NETWORK GRAPH
  const renderInvestigations = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Network Graph */}
        <div className={`lg:col-span-2 p-6 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Network className="w-5 h-5" /> Személyek & Kapcsolatok Hálózata
          </h3>
          <NetworkGraph data={data} selectedPerson={selectedPerson} setSelectedPerson={setSelectedPerson} darkMode={darkMode} />
        </div>

        {/* Investigations List */}
        <div className={`p-6 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h3 className="text-lg font-semibold mb-4">Nyomozások ({data?.investigations.length || 0})</h3>
          <div className="space-y-3">
            {data?.investigations.map(inv => (
              <div
                key={inv.id}
                className={`p-3 rounded-lg border-l-4 border-yellow-500 ${
                  darkMode ? 'bg-gray-700' : 'bg-yellow-50'
                }`}
              >
                <p className="font-semibold text-sm">{inv.title}</p>
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {inv.investigating_authority}
                </p>
                <p className={`text-xs mt-2 font-semibold ${
                  inv.status === 'ongoing' ? 'text-red-500' : 'text-gray-500'
                }`}>
                  {inv.status === 'ongoing' ? '🔴 Folyamatban' : '🟡 Függőben'}
                </p>
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Összeg: {(inv.involved_amount / 1000000000).toFixed(1)}B HUF
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Person Details */}
      {selectedPerson && data && (
        <PersonDetailPanel
          person={selectedPerson}
          data={data}
          darkMode={darkMode}
          onClose={() => setSelectedPerson(null)}
        />
      )}
    </div>
  );

  if (!data) return <div className="p-8 text-center">Adatok betöltése...</div>;

  return (
    <div className={darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="p-6 border-b flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Globe className="w-8 h-8" /> NER Tracker
            </h1>
            <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Magyar kormányzati korrupciós ügyek nyilvántartása
            </p>
          </div>
          <button
            onClick={toggleDarkMode}
            className={`p-2 rounded-lg transition ${
              darkMode
                ? 'bg-gray-800 hover:bg-gray-700'
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>

        {/* Export Buttons */}
        <div className="p-6 border-b flex gap-2">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            <Download className="w-4 h-4" /> CSV Export
          </button>
          <button
            onClick={exportToPDF}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
          >
            <Download className="w-4 h-4" /> PDF Report
          </button>
        </div>

        {/* Tabs */}
        <div className={`border-b flex gap-4 p-6 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          {[
            { id: 'overview', label: '📊 Áttekintés', icon: TrendingUp },
            { id: 'cases', label: '📋 Ügyek', icon: MapPin },
            { id: 'investigations', label: '🔍 Nyomozások', icon: Users }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-2 px-2 font-semibold transition border-b-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-500'
                  : darkMode
                    ? 'border-transparent text-gray-400 hover:text-gray-300'
                    : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'cases' && renderCases()}
          {activeTab === 'investigations' && renderInvestigations()}
        </div>
      </div>
    </div>
  );
};

// ==================== SUB-COMPONENTS ====================

const MetricCard = ({ icon, label, value, subtext, color }) => {
  const colorMap = {
    blue: 'bg-blue-500/20 border-blue-500/50',
    red: 'bg-red-500/20 border-red-500/50',
    purple: 'bg-purple-500/20 border-purple-500/50',
    green: 'bg-green-500/20 border-green-500/50',
    orange: 'bg-orange-500/20 border-orange-500/50'
  };
  return (
    <div className={`p-4 rounded-lg border ${colorMap[color]}`}>
      <div className="flex items-center gap-2 mb-2 opacity-75">{icon} {label}</div>
      <p className="text-2xl font-bold">{value}</p>
      {subtext && <p className="text-xs opacity-60">{subtext}</p>}
    </div>
  );
};

const SearchAndFilters = ({
  darkMode, searchTerm, setSearchTerm, filterStatus, setFilterStatus,
  filterCategory, setFilterCategory, filterAmountRange, setFilterAmountRange
}) => (
  <div className={`p-6 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-2">
        <Search className="w-5 h-5 opacity-50" />
        <input
          type="text"
          placeholder="Keresés ügyek vagy személyek után..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`flex-1 px-4 py-2 rounded-lg border transition ${
            darkMode
              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
          }`}
        />
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-semibold block mb-2">Státusz</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border ${
              darkMode
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300'
            }`}
          >
            <option value="all">Összes</option>
            <option value="active">Aktív</option>
            <option value="investigation">Nyomozás</option>
            <option value="closed">Lezárult</option>
            <option value="appeal">Fellebbezés</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-semibold block mb-2">Kategória</label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border ${
              darkMode
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300'
            }`}
          >
            <option value="all">Összes</option>
            <option value="korrupció">Korrupció</option>
            <option value="pénzügyi">Pénzügyi</option>
            <option value="közbeszerzés">Közbeszerzés</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-semibold block mb-2">Összeg (Mrd HUF)</label>
          <input
            type="range"
            min="0"
            max="35"
            value={filterAmountRange[1] / 1000000000}
            onChange={(e) => setFilterAmountRange([0, parseInt(e.target.value) * 1000000000])}
            className="w-full"
          />
          <p className="text-xs opacity-60 mt-1">Max: {(filterAmountRange[1] / 1000000000).toFixed(1)}B</p>
        </div>
      </div>
    </div>
  </div>
);

const InteractiveMap = ({ cases, selectedRegion, setSelectedRegion, darkMode }) => {
  const regionCounts = {};
  cases.forEach(c => {
    regionCounts[c.region] = (regionCounts[c.region] || 0) + 1;
  });

  const maxCount = Math.max(...Object.values(regionCounts), 1);

  return (
    <div className="space-y-4">
      <div className={`grid grid-cols-2 gap-2 p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
        {Object.entries(regionCounts).map(([region, count]) => (
          <button
            key={region}
            onClick={() => setSelectedRegion(selectedRegion === region ? null : region)}
            className={`p-2 rounded transition text-sm font-semibold ${
              selectedRegion === region
                ? 'bg-blue-600 text-white'
                : darkMode
                  ? 'bg-gray-600 hover:bg-gray-500'
                  : 'bg-gray-300 hover:bg-gray-400'
            }`}
            style={{
              opacity: selectedRegion ? (selectedRegion === region ? 1 : 0.5) : 1
            }}
          >
            {region} ({count})
          </button>
        ))}
      </div>
      <p className={`text-sm p-4 rounded-lg ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
        💡 Kattints egy régióra szűréshez. {selectedRegion ? `Szűrve: ${selectedRegion}` : 'Összes régió megjelenítvve'}
      </p>
    </div>
  );
};

const CaseDetailPanel = ({ case: c, darkMode, onClose }) => (
  <div className={`p-6 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
    <div className="flex justify-between items-start mb-4">
      <div>
        <h3 className="text-2xl font-bold">{c.title}</h3>
        <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{c.description}</p>
      </div>
      <button onClick={onClose} className="text-2xl opacity-50 hover:opacity-100">×</button>
    </div>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div>
        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Státusz</p>
        <p className="font-semibold">{getStatusLabel(c.status)}</p>
      </div>
      <div>
        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Kategória</p>
        <p className="font-semibold">{c.category}</p>
      </div>
      <div>
        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Régió</p>
        <p className="font-semibold">{c.region}</p>
      </div>
      <div>
        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Összeg</p>
        <p className="font-semibold">{(c.amount_huf / 1000000000).toFixed(1)}B HUF</p>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <p className={`text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Érintett Személyek</p>
        <div className="space-y-2">
          {c.involved_persons.map(p => (
            <div key={p.id} className={`p-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <p className="font-semibold text-sm">{p.name}</p>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{p.position}</p>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className={`text-sm font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Egyéb Adatok</p>
        <div className={`p-4 rounded space-y-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
          <p className="text-sm"><strong>Forrás:</strong> {c.source}</p>
          <p className="text-sm"><strong>Dátum:</strong> {c.date}</p>
          <a href={c.link} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline">
            → Forrás megtekintése
          </a>
        </div>
      </div>
    </div>
  </div>
);

const NetworkGraph = ({ data, selectedPerson, setSelectedPerson, darkMode }) => {
  if (!data) return null;

  const allPersons = [];
  data.cases.forEach(c => {
    c.involved_persons.forEach(p => {
      if (!allPersons.find(x => x.id === p.id)) {
        allPersons.push(p);
      }
    });
  });

  return (
    <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {allPersons.map(person => {
          const relatedCases = data.cases.filter(c =>
            c.involved_persons.some(p => p.id === person.id)
          );
          const connections = data.connections?.filter(conn =>
            conn.from === person.id || conn.to === person.id
          ) || [];

          return (
            <div
              key={person.id}
              onClick={() => setSelectedPerson(selectedPerson?.id === person.id ? null : person)}
              className={`p-3 rounded-lg cursor-pointer transition border-l-4 ${
                selectedPerson?.id === person.id
                  ? darkMode ? 'bg-blue-900 border-blue-500' : 'bg-blue-100 border-blue-500'
                  : darkMode ? 'bg-gray-600 border-gray-500 hover:bg-gray-500' : 'bg-gray-200 border-gray-400 hover:bg-gray-300'
              }`}
            >
              <p className="font-semibold">{person.name}</p>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{person.position}</p>
              <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {relatedCases.length} ügy • {connections.length} kapcsolat
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const PersonDetailPanel = ({ person, data, darkMode, onClose }) => {
  const relatedCases = data.cases.filter(c =>
    c.involved_persons.some(p => p.id === person.id)
  );
  const connections = data.connections?.filter(conn =>
    conn.from === person.id || conn.to === person.id
  ) || [];

  return (
    <div className={`p-6 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-2xl font-bold">{person.name}</h3>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{person.position}</p>
        </div>
        <button onClick={onClose} className="text-2xl opacity-50 hover:opacity-100">×</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className={`font-semibold mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Érintett Ügyek ({relatedCases.length})</h4>
          <div className="space-y-2">
            {relatedCases.map(c => (
              <div key={c.id} className={`p-3 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <p className="font-semibold text-sm">{c.title}</p>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{c.region} • {c.date}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className={`font-semibold mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Szervezeti Kapcsolatok ({connections.length})</h4>
          <div className="space-y-2">
            {connections.map((conn, idx) => {
              const otherPersonId = conn.from === person.id ? conn.to : conn.from;
              const otherPerson = data.cases.flatMap(c => c.involved_persons).find(p => p.id === otherPersonId);
              return (
                <div key={idx} className={`p-3 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <p className="text-sm"><strong>{conn.type}:</strong> {otherPerson?.name || otherPersonId}</p>
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{conn.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== UTILITY FUNCTIONS ====================

const getCategoryColor = (category) => {
  const colors = {
    korrupció: '#ef4444',
    pénzügyi: '#3b82f6',
    közbeszerzés: '#8b5cf6'
  };
  return colors[category] || '#6b7280';
};

const getStatusLabel = (status) => {
  const labels = {
    active: 'Aktív',
    investigation: 'Nyomozás',
    closed: 'Lezárult',
    appeal: 'Fellebbezés'
  };
  return labels[status] || status;
};

const getStatusBadge = (status) => {
  const badges = {
    active: 'bg-yellow-500/20 text-yellow-700 border border-yellow-500/50',
    investigation: 'bg-red-500/20 text-red-700 border border-red-500/50',
    closed: 'bg-green-500/20 text-green-700 border border-green-500/50',
    appeal: 'bg-orange-500/20 text-orange-700 border border-orange-500/50'
  };
  return badges[status] || 'bg-gray-500/20 text-gray-700';
};

export default Dashboard;
