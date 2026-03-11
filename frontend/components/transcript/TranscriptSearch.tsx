'use client';

import React, { useState } from 'react';
import { useTranscript } from '@/context/TranscriptContext';

export function TranscriptSearch() {
  const { state, searchTranscript, clearHighlights } = useTranscript();
  const [searchValue, setSearchValue] = useState('');

  const handleSearch = (value: string) => {
    setSearchValue(value);
    if (value.trim()) {
      searchTranscript(value);
    } else {
      clearHighlights();
    }
  };

  const handleClear = () => {
    setSearchValue('');
    searchTranscript('');
    clearHighlights();
  };

  return (
    <div className="p-3 border-b border-gray-700">
      <div className="relative">
        <input
          type="text"
          value={searchValue}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search transcript..."
          className="w-full px-3 py-2 pr-20 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-cyan-500 transition-colors"
        />
        {searchValue && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-gray-400 hover:text-white transition-colors"
          >
            Clear
          </button>
        )}
      </div>
      {state.searchResults.length > 0 && (
        <div className="mt-2 text-xs text-gray-400">
          {state.searchResults.length} result{state.searchResults.length !== 1 ? 's' : ''} found
        </div>
      )}
    </div>
  );
}
