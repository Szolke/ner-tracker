import React, { useState, useEffect } from 'react';
import { Search, Filter, TrendingUp, Calendar, Tag, ExternalLink } from 'lucide-react';

export default function Dashboard() {
  const [articles, setArticles] = useState([]);
  const [filteredArticles, setFilteredArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedSource, setSelectedSource] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/data/news.json');
        const data = await response.json();
        setArticles(data.articles || []);
      } catch (error) {
        console.error('Error loading data:', error);
        setArticles([]);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  useEffect(() => {
    let filtered = articles;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        article => article.title.toLowerCase().includes(term) ||
                   article.description.toLowerCase().includes(term)
      );
    }

    if (selectedTags.length > 0) {
      filtered = filtered.filter(article =>
        selectedTags.some(tag => article.tags.includes(tag))
      );
    }

    if (selectedSource !== 'all') {
      filtered = filtered.filter(article => article.source === selectedSource);
    }

    setFilteredArticles(filtered);
  }, [articles, searchTerm, selectedTags, selectedSource]);

  const allTags = [...new Set(articles.flatMap(a => a.tags))];
  const sources = [...new Set(articles.map(a => a.source))];

  const toggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('hu-HU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-black/50 border-b border-slate-700 sticky top-0 z-50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-8 h-8 text-red-500" />
            <h1 className="text-3xl font-bold text-white">NER Tracker</h1>
            <span className="text-sm text-slate-400 ml-auto">Közérdekű adatok</span>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
              <p className="text-slate-400 text-sm">Cikkek</p>
              <p className="text-2xl font-bold text-white">{articles.length}</p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
              <p className="text-slate-400 text-sm">Találatok</p>
              <p className="text-2xl font-bold text-white">{filteredArticles.length}</p>
            </div>
            <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
              <p className="text-slate-400 text-sm">Források</p>
              <p className="text-2xl font-bold text-white">{sources.length}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Search */}
        <div className="mb-8">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Keress cikkek között..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded pl-10 pr-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-slate-500"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center mb-4">
            <Filter className="w-4 h-4 text-slate-400" />
            
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded px-3 py-1 text-sm text-white"
            >
              <option value="all">Összes forrás</option>
              {sources.map(source => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1 rounded text-sm transition ${
                  selectedTags.includes(tag)
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-600'
                }`}
              >
                <Tag className="w-3 h-3 inline mr-1" />
                {tag}
              </button>
            ))}
          </div>

          {(searchTerm || selectedTags.length > 0 || selectedSource !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedTags([]);
                setSelectedSource('all');
              }}
              className="text-sm text-slate-400 hover:text-white transition mt-3"
            >
              Szűrők törlése
            </button>
          )}
        </div>

        {/* Articles */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
            <p className="text-slate-400 mt-4">Adatok betöltése...</p>
          </div>
        ) : filteredArticles.length > 0 ? (
          <div className="grid gap-4">
            {filteredArticles.map((article, idx) => (
              <article
                key={article.id || idx}
                className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 hover:border-slate-600 transition backdrop-blur"
              >
                <div className="flex justify-between items-start gap-4 mb-3">
                  <h2 className="text-lg font-semibold text-white flex-1">{article.title}</h2>
                  <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded whitespace-nowrap">
                    {article.source}
                  </span>
                </div>

                <p className="text-slate-300 text-sm mb-4 line-clamp-2">{article.description}</p>

                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-1 text-sm text-slate-400">
                    <Calendar className="w-4 h-4" />
                    {formatDate(article.date)}
                  </div>

                  <div className="flex items-center gap-2">
                    {article.tags.map(tag => (
                      <span
                        key={tag}
                        className="text-xs bg-red-900/30 text-red-200 px-2 py-1 rounded border border-red-800/50"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <a
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 text-red-400 hover:text-red-300 transition text-sm font-medium"
                >
                  Teljes cikk <ExternalLink className="w-3 h-3" />
                </a>
              </article>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-slate-400">Nincs találat a megadott szűrőkhöz.</p>
          </div>
        )}

        <div className="mt-6 text-center text-slate-400 text-sm">
          {filteredArticles.length} találat {articles.length} közül
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700 mt-12 py-6 text-center text-slate-400 text-sm">
        <p>NER Tracker - Közérdekű adatok gyűjtése</p>
      </footer>
    </div>
  );
}
