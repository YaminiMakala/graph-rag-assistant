import React from 'react';
import { Database, FileText, BarChart3, Cpu } from 'lucide-react';

const StatsPanel = ({ stats, uploadStatus }) => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-blue-600" />
        System Status
      </h3>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">Neo4j Database</span>
          </div>
          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
            Connected
          </span>
        </div>

        <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-gray-700">Vector Engine</span>
          </div>
          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
            Ready
          </span>
        </div>

        {uploadStatus?.type === 'success' && (
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Last Upload</span>
            </div>
            <p className="text-xs text-green-700">{uploadStatus.message}</p>
            {uploadStatus.details && (
              <p className="text-xs text-green-600 mt-1">{uploadStatus.details}</p>
            )}
          </div>
        )}

        {stats && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <h4 className="text-xs font-semibold text-gray-600 mb-2">SYSTEM STATS</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-gray-600">Papers:</div>
              <div className="text-gray-800 font-medium">{stats.papers_processed}</div>
              <div className="text-gray-600">Chunks:</div>
              <div className="text-gray-800 font-medium">{stats.chunks_processed}</div>
              <div className="text-gray-600">Vectorizer:</div>
              <div className="text-gray-800 font-medium">
                {stats.vectorizer_fitted ? 'Trained' : 'Ready'}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
        <h4 className="text-xs font-semibold text-yellow-800 mb-1">💡 PRO TIP</h4>
        <p className="text-xs text-yellow-700">
          Ask questions like: "What is batch normalization?" or "Summarize the key findings"
        </p>
      </div>
    </div>
  );
};

export default StatsPanel;