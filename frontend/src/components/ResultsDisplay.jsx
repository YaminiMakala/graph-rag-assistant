import React from 'react';
import { FileText, Users, Link, Clipboard, BarChart3, Brain, ExternalLink } from 'lucide-react';

const ResultsDisplay = ({ results, activeTab, onTabChange }) => {
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // You can add a toast notification here
  };

  const renderAnswer = () => (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">AI Analysis</h3>
          </div>
          <button
            onClick={() => copyToClipboard(results.answer)}
            className="text-blue-600 hover:text-blue-800 transition-colors"
            title="Copy analysis"
          >
            <Clipboard className="w-4 h-4" />
          </button>
        </div>
        <p className="text-blue-900 whitespace-pre-wrap leading-relaxed text-lg">
          {results.answer}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">Semantic Search</span>
          </div>
          <p className="text-sm text-green-600">
            Found {results.vector_context.length} relevant text passages
          </p>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Link className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-700">Knowledge Graph</span>
          </div>
          <p className="text-sm text-purple-600">
            Analyzed {results.graph_context.filter(item => item.type === 'paper').length} research papers
          </p>
        </div>
      </div>
    </div>
  );

  const renderVectorContext = () => (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-blue-600" />
        Semantic Search Results ({results.vector_context.length} relevant passages)
      </h3>
      
      {results.vector_context.map((result, index) => (
        <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
          <div className="flex items-start justify-between mb-3">
            <span className="text-xs font-medium text-white bg-blue-600 px-2 py-1 rounded">
              Relevance: {(result.similarity * 100).toFixed(1)}%
            </span>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              Paper: {result.paper_id.slice(0, 8)}...
            </span>
          </div>
          <p className="text-gray-700 text-sm leading-relaxed">
            {result.text.length > 400 ? result.text.slice(0, 400) + '...' : result.text}
          </p>
          {result.text.length > 400 && (
            <button className="text-xs text-blue-600 hover:text-blue-800 mt-2 font-medium">
              Show full text
            </button>
          )}
        </div>
      ))}
    </div>
  );

  const renderGraphContext = () => {
    const papers = results.graph_context.filter(item => item.type === 'paper');
    const relationships = results.graph_context.filter(item => item.type === 'relationship');

    return (
      <div className="space-y-6">
        <div>
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-600" />
            Research Papers Analyzed ({papers.length})
          </h3>
          
          {papers.map((paper, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4 hover:shadow-md transition-shadow bg-white">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-gray-500" />
                <h4 className="font-medium text-gray-900">{paper.data.title}</h4>
              </div>
              
              {paper.data.authors && paper.data.authors.length > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700">
                    <strong>Authors:</strong> {paper.data.authors.join(', ')}
                  </span>
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-gray-100">
                <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Link className="w-3 h-3" />
                  Knowledge Connections:
                </h5>
                <div className="space-y-1">
                  {relationships
                    .filter(rel => rel.data.from === paper.data.id)
                    .map((rel, relIndex) => (
                      <div key={relIndex} className="flex items-center gap-2 text-xs text-gray-600">
                        <span className="bg-gray-100 px-2 py-1 rounded">
                          {rel.data.type}: {rel.data.to.slice(0, 8)}...
                        </span>
                      </div>
                    ))}
                  
                  {relationships.filter(rel => rel.data.from === paper.data.id).length === 0 && (
                    <p className="text-xs text-gray-500">No direct connections found</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const tabs = [
    { id: 'answer', label: 'AI Analysis', icon: Brain },
    { id: 'vector', label: 'Semantic Results', icon: BarChart3 },
    { id: 'graph', label: 'Knowledge Graph', icon: Link },
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200">
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 py-4 px-6 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <IconComponent className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-6 max-h-96 overflow-y-auto">
        {activeTab === 'answer' && renderAnswer()}
        {activeTab === 'vector' && renderVectorContext()}
        {activeTab === 'graph' && renderGraphContext()}
      </div>
    </div>
  );
};

export default ResultsDisplay;