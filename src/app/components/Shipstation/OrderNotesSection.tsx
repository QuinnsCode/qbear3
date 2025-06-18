"use client"

import { useState, useCallback } from 'react';
import { MessageSquare, Plus, User, Clock, Lock, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrderNote {
  id: number;
  content: string;
  isInternal: boolean;
  createdAt: string;
  user?: {
    id: string;
    username: string;
  };
}

interface OrderNotesSectionProps {
  notes: OrderNote[];
  setNotes: (notes: OrderNote[]) => void;
  orderDbId: number;
  currentUser?: {
    id: string;
    username: string;
  };
}

export default function OrderNotesSection({ 
  notes, 
  setNotes, 
  orderDbId, 
  currentUser 
}: OrderNotesSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitNote = useCallback(async () => {
    if (!newNote.trim() || !currentUser || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/orders/${orderDbId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newNote.trim(),
          isInternal
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save note');
      }

      // Don't manually update notes - let realtime handle it
      setNewNote('');
      setIsInternal(false);
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Failed to save note. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [newNote, isInternal, currentUser, orderDbId, isSubmitting]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="mt-6 bg-white dark:bg-slate-800 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-600">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 w-full text-left hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <MessageSquare className="w-5 h-5" />
          <span className="font-medium">Order Notes</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            ({notes.length})
          </span>
          <span className={cn(
            "ml-auto transition-transform duration-200",
            isExpanded ? "rotate-180" : ""
          )}>
            ▼
          </span>
        </button>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4">
          {/* Add New Note */}
          {currentUser && (
            <div className="mb-4 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">Add Note as {currentUser.username}</span>
              </div>
              
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Enter your note here..."
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md resize-vertical min-h-[80px] bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
                disabled={isSubmitting}
              />
              
              <div className="flex items-center justify-between mt-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                    disabled={isSubmitting}
                    className="rounded"
                  />
                  <Lock className="w-4 h-4" />
                  <span>Internal note (private)</span>
                </label>
                
                <button
                  onClick={handleSubmitNote}
                  disabled={!newNote.trim() || isSubmitting}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    !newNote.trim() || isSubmitting
                      ? "bg-gray-300 dark:bg-gray-600 text-gray-500"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  )}
                >
                  <Plus className="w-4 h-4" />
                  {isSubmitting ? 'Saving...' : 'Add Note'}
                </button>
              </div>
            </div>
          )}

          {/* Notes List */}
          <div className="space-y-3">
            {notes.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No notes yet. {currentUser ? 'Add the first note above!' : 'Login to add notes.'}
              </p>
            ) : (
              notes.map((note) => (
                <div
                  key={note.id}
                  className={cn(
                    "p-4 rounded-lg border",
                    note.isInternal
                      ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
                      : "bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-gray-600"
                  )}
                >
                  {/* Note Header */}
                  <div className="flex items-center gap-2 mb-2 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      {note.isInternal ? (
                        <>
                          <Lock className="w-4 h-4" />
                          <span>Internal</span>
                        </>
                      ) : (
                        <>
                          <Globe className="w-4 h-4" />
                          <span>Public</span>
                        </>
                      )}
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      <span>{note.user?.username || 'Unknown User'}</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{formatDate(note.createdAt)}</span>
                    </div>
                  </div>
                  
                  {/* Note Content */}
                  <div className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                    {note.content}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}