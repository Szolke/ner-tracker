import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('NER Tracker component error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      const { fallback, label = 'Komponens' } = this.props;
      if (fallback) return fallback;
      return (
        <div className="p-6 rounded-xl border border-red-500/30 bg-red-500/10 text-center">
          <p className="text-2xl mb-2">⚠️</p>
          <p className="font-semibold text-red-400">{label} betöltési hiba</p>
          <p className="text-sm opacity-60 mt-1">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-3 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition">
            Újrapróbálás
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
