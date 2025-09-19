import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import axios from 'axios';

const FileUpload = ({ onUploadStatus, onStatsUpdate }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsUploading(true);
      onUploadStatus({ type: 'loading', message: 'Uploading and processing PDF...' });
      
      const response = await axios.post('http://localhost:8000/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000, // 2 minutes timeout
      });

      onUploadStatus({ 
        type: 'success', 
        message: `Processed: ${response.data.title}`,
        details: `${response.data.chunks_processed} chunks • ${response.data.authors.join(', ')}`
      });

      // Fetch updated stats
      try {
        const statsResponse = await axios.get('http://localhost:8000/stats');
        onStatsUpdate(statsResponse.data);
      } catch (statsError) {
        console.error('Failed to fetch stats:', statsError);
      }
      
    } catch (error) {
      console.error('Upload error:', error);
      onUploadStatus({ 
        type: 'error', 
        message: error.response?.data?.detail || 'Upload failed. Please try again.',
        details: error.response?.status ? `Status: ${error.response.status}` : ''
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'application/pdf') {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      handleFileUpload(file);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
      <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-blue-600" />
        Upload Research Papers
      </h2>

      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragging 
            ? 'border-blue-400 bg-blue-50 scale-105' 
            : 'border-gray-300 hover:border-blue-300 hover:bg-blue-25'
        } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && document.getElementById('file-input').click()}
      >
        {isUploading ? (
          <div className="space-y-3">
            <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
            <p className="text-gray-600 font-medium">Processing PDF...</p>
            <p className="text-sm text-gray-500">Extracting text and building knowledge graph</p>
          </div>
        ) : (
          <>
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2 font-medium">
              Drag & drop your PDF here, or click to browse
            </p>
            <p className="text-sm text-gray-500">
              Supports research papers in PDF format
            </p>
          </>
        )}
        <input
          id="file-input"
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          disabled={isUploading}
          className="hidden"
        />
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="font-medium text-gray-700 mb-3">How it works:</h3>
        <ul className="text-sm text-gray-600 space-y-2">
          <li className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            Upload academic papers or research PDFs
          </li>
          <li className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            The system extracts text and creates embeddings
          </li>
          <li className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            Builds a knowledge graph of authors and concepts
          </li>
          <li className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            Enables semantic search across all uploaded papers
          </li>
        </ul>
      </div>
    </div>
  );
};

export default FileUpload;