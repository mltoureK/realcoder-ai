'use client';

import { useState } from 'react';
import { CodeFile } from '@/types/code';

interface FileTabsProps {
  files: CodeFile[];
  activeFileId: string;
  onFileSelect: (fileId: string) => void;
  onFileCreate: (name: string) => void;
}

export default function FileTabs({ files, activeFileId, onFileSelect, onFileCreate }: FileTabsProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  const handleCreateFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFileName.trim()) {
      onFileCreate(newFileName.trim());
      setNewFileName('');
      setShowCreateForm(false);
    }
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'js':
      case 'jsx':
        return '📄';
      case 'ts':
      case 'tsx':
        return '📄';
      case 'html':
        return '🌐';
      case 'css':
        return '🎨';
      case 'json':
        return '📋';
      default:
        return '📄';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Files
          </h3>
          <button
            onClick={() => setShowCreateForm(true)}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title="Create new file"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      <div className="p-2">
        {showCreateForm && (
          <form onSubmit={handleCreateFile} className="mb-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="filename.js"
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
              autoFocus
            />
            <div className="flex space-x-2 mt-2">
              <button
                type="submit"
                className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewFileName('');
                }}
                className="px-2 py-1 text-xs bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="space-y-1">
          {files.map((file) => (
            <button
              key={file.id}
              onClick={() => onFileSelect(file.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                file.id === activeFileId
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span>{getFileIcon(file.name)}</span>
                <span className="truncate">{file.name}</span>
              </div>
            </button>
          ))}
        </div>

        {files.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p className="text-sm">No files yet</p>
            <p className="text-xs mt-1">Create your first file to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}

