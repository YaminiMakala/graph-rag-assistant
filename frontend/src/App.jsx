import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import QuestionForm from './components/QuestionForm';
import ResultsDisplay from './components/ResultsDisplay';
import Header from './components/Header';
import StatsPanel from './components/StatsPanel';

function App() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('answer');
  const [uploadStatus, setUploadStatus] = useState(null);
  const [stats, setStats] = useState(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <Header />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FileUpload 
                onUploadStatus={setUploadStatus}
                onStatsUpdate={setStats}
              />
              <QuestionForm 
                onResults={setResults}
                onLoading={setLoading}
                uploadStatus={uploadStatus}
              />
            </div>
          </div>
          
          <div className="lg:col-span-1">
            <StatsPanel stats={stats} uploadStatus={uploadStatus} />
          </div>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-lg text-gray-600 font-medium">Analyzing your question...</p>
            <p className="text-sm text-gray-500">Searching through research papers and knowledge graph</p>
          </div>
        )}

        {results && !loading && (
          <ResultsDisplay 
            results={results}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        )}
      </div>
    </div>
  );
}

export default App;