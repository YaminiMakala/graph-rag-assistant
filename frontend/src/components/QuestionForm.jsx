import React, { useState } from 'react';
import { Send, Brain, Sparkles, Lightbulb } from 'lucide-react';
import axios from 'axios';

const QuestionForm = ({ onResults, onLoading, uploadStatus }) => {
  const [question, setQuestion] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    try {
      onLoading(true);
      const response = await axios.post('http://localhost:8000/ask', {
        question: question.trim()
      });
      
      onResults(response.data);
    } catch (error) {
      console.error('Error asking question:', error);
      alert(error.response?.data?.detail || 'Error processing your question. Please try again.');
    } finally {
      onLoading(false);
    }
  };

  const getStatusIcon = () => {
    switch (uploadStatus?.type) {
      case 'success':
        return <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>;
      case 'error':
        return <div className="w-3 h-3 bg-red-500 rounded-full"></div>;
      case 'loading':
        return <div className="w-3 h-3 bg-blue-500 rounded-full animate-spin"></div>;
      default:
        return <div className="w-3 h-3 bg-gray-300 rounded-full"></div>;
    }
  };

  const getStatusMessage = () => {
    if (!uploadStatus) return 'Ready to process papers';
    return uploadStatus.message;
  };

  const exampleQuestions = [
    "What is the main contribution of this paper?",
    "Explain the methodology used in this research",
    "What are the key findings or results?",
    "How does this approach compare to existing methods?",
    "What datasets were used for evaluation?",
    "What are the limitations of this work?"
  ];

  const insertExampleQuestion = (example) => {
    setQuestion(example);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
      <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Brain className="w-5 h-5 text-purple-600" />
        Ask a Question
      </h2>

      <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
        <div className="flex items-center gap-2 mb-1">
          {getStatusIcon()}
          <span className="text-sm font-medium text-gray-700">System Status</span>
        </div>
        <p className="text-sm text-gray-600">{getStatusMessage()}</p>
        {uploadStatus?.details && (
          <p className="text-xs text-gray-500 mt-1">{uploadStatus.details}</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-2">
            Ask about the research:
          </label>
          <textarea
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g., What is the main contribution of this paper?"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all"
            rows="4"
            disabled={!uploadStatus || uploadStatus.type === 'loading'}
          />
        </div>

        <button
          type="submit"
          disabled={!question.trim() || !uploadStatus || uploadStatus.type !== 'success'}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
        >
          <Send className="w-4 h-4" />
          Analyze Research
        </button>
      </form>

      <div className="mt-6">
        <h3 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-yellow-600" />
          Example questions:
        </h3>
        <div className="space-y-2">
          {exampleQuestions.map((example, index) => (
            <button
              key={index}
              type="button"
              onClick={() => insertExampleQuestion(example)}
              className="w-full text-left p-2 text-sm text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors duration-150 border border-gray-200 hover:border-blue-300"
            >
              <Sparkles className="w-3 h-3 inline mr-2 text-blue-500" />
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuestionForm;