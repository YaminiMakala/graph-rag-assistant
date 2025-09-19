import React from 'react';
import { Brain, BookOpen } from 'lucide-react';

const Header = () => {
  return (
    <header className="text-center mb-12">
      <div className="flex items-center justify-center gap-3 mb-4">
        <div className="p-3 bg-blue-600 rounded-xl">
          <Brain className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-gray-800 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          GraphRAG Research Assistant
        </h1>
      </div>
      <p className="text-lg text-gray-600 max-w-2xl mx-auto">
        Upload research papers and ask intelligent questions using AI-powered semantic search 
        and knowledge graph technology
      </p>
      <div className="mt-4 flex items-center justify-center gap-2 text-sm text-blue-600">
        <BookOpen className="w-4 h-4" />
        <span>Powered by Neo4j Knowledge Graphs & Vector Search</span>
      </div>
    </header>
  );
};

export default Header;