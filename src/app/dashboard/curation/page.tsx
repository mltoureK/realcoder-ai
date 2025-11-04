'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Question } from '@/lib/question-types';

interface CuratedQuestion extends Question {
  id: string;
  status: 'draft' | 'review' | 'approved' | 'rejected';
  curatorNotes?: string;
  createdAt: string;
  lastModified: string;
}

export default function QuestionCurationPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [questions, setQuestions] = useState<CuratedQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState<CuratedQuestion | null>(null);
  const [editing, setEditing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'draft' | 'review' | 'approved' | 'rejected'>('all');

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  // Mock data for now - replace with actual API calls
  useEffect(() => {
    const mockQuestions: CuratedQuestion[] = [
      {
        id: '1',
        type: 'multiple-choice',
        question: 'What is the correct way to initialize a React component?',
        options: [
          'class MyComponent extends React.Component',
          'function MyComponent() { return <div>Hello</div>; }',
          'const MyComponent = () => <div>Hello</div>;',
          'All of the above'
        ],
        correctAnswer: 'All of the above',
        explanation: 'React supports multiple ways to create components: class components, function components, and arrow function components.',
        difficulty: 'medium',
        language: 'javascript',
        codeContext: '// React component examples\nclass MyComponent extends React.Component {\n  render() {\n    return <div>Hello</div>;\n  }\n}',
        status: 'draft',
        curatorNotes: 'Good question, but needs better code context',
        createdAt: '2024-01-15T10:00:00Z',
        lastModified: '2024-01-15T10:00:00Z'
      },
      {
        id: '2',
        type: 'function-variant',
        question: 'Analyze this function and identify the bug',
        options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
        correctAnswer: 'Option 2',
        explanation: 'The function has a missing return statement in the else branch.',
        difficulty: 'hard',
        language: 'javascript',
        codeContext: 'function calculateTotal(items) {\n  if (items.length > 0) {\n    return items.reduce((sum, item) => sum + item.price, 0);\n  } else {\n    // Missing return statement\n  }\n}',
        status: 'approved',
        curatorNotes: 'Excellent question with clear bug identification',
        createdAt: '2024-01-14T15:30:00Z',
        lastModified: '2024-01-14T15:30:00Z'
      }
    ];
    
    setQuestions(mockQuestions);
    setLoading(false);
  }, []);

  const filteredQuestions = questions.filter(q => 
    filter === 'all' || q.status === filter
  );

  const handleStatusChange = (questionId: string, newStatus: CuratedQuestion['status']) => {
    setQuestions(prev => prev.map(q => 
      q.id === questionId 
        ? { ...q, status: newStatus, lastModified: new Date().toISOString() }
        : q
    ));
  };

  const handleSaveQuestion = (updatedQuestion: CuratedQuestion) => {
    setQuestions(prev => prev.map(q => 
      q.id === updatedQuestion.id ? updatedQuestion : q
    ));
    setEditing(false);
    setSelectedQuestion(null);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading curation dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Please sign in to access the curation dashboard.
          </p>
          <Link
            href="/"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                RealCoder AI
              </h1>
              <span className="ml-3 px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                Beta
              </span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Question Curation Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manually curate and approve high-quality quiz questions
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Question List */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Questions ({filteredQuestions.length})
                  </h2>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm">
                    + New Question
                  </button>
                </div>
                
                {/* Filter Tabs */}
                <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  {[
                    { key: 'all', label: 'All', count: questions.length },
                    { key: 'draft', label: 'Draft', count: questions.filter(q => q.status === 'draft').length },
                    { key: 'review', label: 'Review', count: questions.filter(q => q.status === 'review').length },
                    { key: 'approved', label: 'Approved', count: questions.filter(q => q.status === 'approved').length },
                    { key: 'rejected', label: 'Rejected', count: questions.filter(q => q.status === 'rejected').length }
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setFilter(tab.key as any)}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        filter === tab.key
                          ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      {tab.label} ({tab.count})
                    </button>
                  ))}
                </div>
              </div>

              {/* Question List */}
              <div className="max-h-96 overflow-y-auto">
                {filteredQuestions.map(question => (
                  <div
                    key={question.id}
                    onClick={() => setSelectedQuestion(question)}
                    className={`p-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      selectedQuestion?.id === question.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {question.type.replace('-', ' ').toUpperCase()}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        question.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        question.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                        question.status === 'review' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}>
                        {question.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {question.question}
                    </p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-gray-500 dark:text-gray-500">
                        {question.difficulty} • {question.language}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-500">
                        {new Date(question.lastModified).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Question Editor */}
          <div className="lg:col-span-2">
            {selectedQuestion ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {editing ? 'Edit Question' : 'Question Details'}
                    </h3>
                    <div className="flex space-x-2">
                      {!editing && (
                        <button
                          onClick={() => setEditing(true)}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          Edit
                        </button>
                      )}
                      {editing && (
                        <>
                          <button
                            onClick={() => setEditing(false)}
                            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveQuestion(selectedQuestion)}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                          >
                            Save
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Status Actions */}
                  <div className="flex space-x-2 mb-6">
                    <button
                      onClick={() => handleStatusChange(selectedQuestion.id, 'draft')}
                      className={`px-3 py-1 rounded-md text-sm ${
                        selectedQuestion.status === 'draft'
                          ? 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      Draft
                    </button>
                    <button
                      onClick={() => handleStatusChange(selectedQuestion.id, 'review')}
                      className={`px-3 py-1 rounded-md text-sm ${
                        selectedQuestion.status === 'review'
                          ? 'bg-yellow-200 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-yellow-100 dark:hover:bg-yellow-800'
                      }`}
                    >
                      Review
                    </button>
                    <button
                      onClick={() => handleStatusChange(selectedQuestion.id, 'approved')}
                      className={`px-3 py-1 rounded-md text-sm ${
                        selectedQuestion.status === 'approved'
                          ? 'bg-green-200 dark:bg-green-900 text-green-800 dark:text-green-200'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-green-100 dark:hover:bg-green-800'
                      }`}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleStatusChange(selectedQuestion.id, 'rejected')}
                      className={`px-3 py-1 rounded-md text-sm ${
                        selectedQuestion.status === 'rejected'
                          ? 'bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-200'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-red-100 dark:hover:bg-red-800'
                      }`}
                    >
                      Reject
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  {editing ? (
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Question
                        </label>
                        <textarea
                          value={selectedQuestion.question}
                          onChange={(e) => setSelectedQuestion({
                            ...selectedQuestion,
                            question: e.target.value
                          })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                          rows={3}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Options
                        </label>
                        {selectedQuestion.options.map((option, index) => (
                          <div key={index} className="flex items-center space-x-2 mb-2">
                            <input
                              type="radio"
                              name="correctAnswer"
                              checked={option === selectedQuestion.correctAnswer}
                              onChange={() => setSelectedQuestion({
                                ...selectedQuestion,
                                correctAnswer: option
                              })}
                              className="text-blue-600"
                            />
                            <input
                              type="text"
                              value={option}
                              onChange={(e) => {
                                const newOptions = [...selectedQuestion.options];
                                newOptions[index] = e.target.value;
                                setSelectedQuestion({
                                  ...selectedQuestion,
                                  options: newOptions
                                });
                              }}
                              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                          </div>
                        ))}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Explanation
                        </label>
                        <textarea
                          value={selectedQuestion.explanation}
                          onChange={(e) => setSelectedQuestion({
                            ...selectedQuestion,
                            explanation: e.target.value
                          })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                          rows={3}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Curator Notes
                        </label>
                        <textarea
                          value={selectedQuestion.curatorNotes || ''}
                          onChange={(e) => setSelectedQuestion({
                            ...selectedQuestion,
                            curatorNotes: e.target.value
                          })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                          rows={2}
                          placeholder="Add notes about this question..."
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Question
                        </h4>
                        <p className="text-gray-900 dark:text-white">{selectedQuestion.question}</p>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Options
                        </h4>
                        <div className="space-y-2">
                          {selectedQuestion.options.map((option, index) => (
                            <div key={index} className={`p-3 rounded-lg border ${
                              option === selectedQuestion.correctAnswer
                                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                                : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                            }`}>
                              <div className="flex items-center space-x-2">
                                {option === selectedQuestion.correctAnswer && (
                                  <span className="text-green-600 dark:text-green-400">✓</span>
                                )}
                                <span className="text-gray-900 dark:text-white">{option}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Explanation
                        </h4>
                        <p className="text-gray-900 dark:text-white">{selectedQuestion.explanation}</p>
                      </div>

                      {selectedQuestion.curatorNotes && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Curator Notes
                          </h4>
                          <p className="text-gray-900 dark:text-white">{selectedQuestion.curatorNotes}</p>
                        </div>
                      )}

                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Code Context
                        </h4>
                        <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg overflow-x-auto text-sm">
                          <code>{selectedQuestion.codeContext}</code>
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
                <div className="text-gray-400 dark:text-gray-500 mb-4">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Select a Question
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Choose a question from the list to view and edit its details.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}



