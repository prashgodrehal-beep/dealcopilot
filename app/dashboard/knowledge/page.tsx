'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { toast } from 'sonner';
import {
  Upload, FileText, Trash2, Loader2, CheckCircle2,
  XCircle, Clock, BookOpen, Brain, AlertCircle,
  RefreshCw, ChevronDown, File, Sparkles,
} from 'lucide-react';

interface KnowledgeSource {
  id: string;
  file_name: string;
  original_name: string;
  file_size: number;
  file_type: string;
  category: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  chunks_count: number;
  error_message: string;
  created_at: string;
}

const CATEGORIES = [
  { value: '', label: 'Auto-detect from filename' },
  { value: 'book', label: 'Book — Book chapters' },
  { value: 'framework', label: 'Framework — Cialdini, JTBD, B=MAP' },
  { value: 'sales', label: 'Sales — Process, techniques, objections' },
  { value: 'neuro', label: 'Neuro — Neuroscience of buying' },
  { value: 'proposal', label: 'Proposal — Writing best practices' },
  { value: 'presentation', label: 'Presentation — Storytelling, structure' },
  { value: 'coaching', label: 'Coaching — Methodologies, session guides' },
  { value: 'general', label: 'General — Other content' },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STATUS_CONFIG = {
  pending: { icon: Clock, color: 'text-gray-400', bg: 'bg-gray-500/10', label: 'Pending' },
  processing: { icon: Loader2, color: 'text-brand-400', bg: 'bg-brand-500/10', label: 'Processing' },
  completed: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Ready' },
  failed: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Failed' },
};

export default function KnowledgeBasePage() {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [totalChunks, setTotalChunks] = useState(0);

  const loadSources = useCallback(async () => {
    const { data } = await supabase
      .from('knowledge_sources')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setSources(data as KnowledgeSource[]);
      setTotalChunks(data.reduce((sum: number, s: KnowledgeSource) => sum + (s.chunks_count || 0), 0));
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadProgress('Uploading file...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (selectedCategory) {
        formData.append('category', selectedCategory);
      }

      setUploadProgress('Extracting text & generating embeddings...');

      const response = await fetch('/api/knowledge/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      toast.success(
        `"${file.name}" processed — ${result.chunks_count} knowledge chunks created`
      );
      setShowUploadForm(false);
      setSelectedCategory('');
      loadSources();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      toast.error(message);
    } finally {
      setUploading(false);
      setUploadProgress('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const handleDelete = async (sourceId: string) => {
    try {
      const response = await fetch('/api/knowledge/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_id: sourceId }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Delete failed');
      }

      toast.success('Knowledge source deleted');
      setDeleteConfirm(null);
      loadSources();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      toast.error(message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    );
  }

  const completedSources = sources.filter((s) => s.status === 'completed');

  return (
    <div className="animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Knowledge Base</h1>
          <p className="text-sm text-gray-500">
            Upload your methodology — the AI coach uses this to give advice in your voice.
          </p>
        </div>
        <button
          onClick={() => loadSources()}
          className="btn-ghost text-sm flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card !p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
            <FileText className="w-3.5 h-3.5" />
            Documents
          </div>
          <div className="text-2xl font-bold text-white">{completedSources.length}</div>
        </div>
        <div className="card !p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
            <Brain className="w-3.5 h-3.5" />
            Knowledge Chunks
          </div>
          <div className="text-2xl font-bold text-brand-400">{totalChunks}</div>
        </div>
        <div className="card !p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            Coach Status
          </div>
          <div className={`text-lg font-bold ${totalChunks > 0 ? 'text-emerald-400' : 'text-gray-600'}`}>
            {totalChunks > 0 ? 'Active' : 'No data'}
          </div>
        </div>
      </div>

      {/* Upload section */}
      <div className="card mb-6">
        {!showUploadForm ? (
          <button
            onClick={() => setShowUploadForm(true)}
            className="w-full flex items-center justify-center gap-3 py-4 text-gray-400 hover:text-brand-400 transition-all"
          >
            <Upload className="w-5 h-5" />
            <span className="font-medium">Upload a methodology file</span>
          </button>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-brand-400" />
                Upload File
              </h3>
              <button
                onClick={() => { setShowUploadForm(false); setSelectedCategory(''); }}
                className="text-xs text-gray-500 hover:text-gray-300"
              >
                Cancel
              </button>
            </div>

            {/* Category selector */}
            <div className="mb-4">
              <label className="input-label">Category</label>
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="input-field appearance-none cursor-pointer !pr-10"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
            </div>

            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                uploading
                  ? 'border-brand-500/30 bg-brand-500/5'
                  : 'border-surface-border hover:border-brand-500/40 hover:bg-surface-hover cursor-pointer'
              }`}
              onClick={() => !uploading && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.md"
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading}
              />
              {uploading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                  <div>
                    <p className="text-sm font-medium text-brand-400">{uploadProgress}</p>
                    <p className="text-xs text-gray-500 mt-1">This may take 10-30 seconds for large files</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
                    <Upload className="w-6 h-6 text-brand-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-300">
                      Drop a file here or click to browse
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PDF, DOCX, TXT, or MD — up to 20MB
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Naming convention tip */}
      {sources.length === 0 && (
        <div className="card mb-6 !bg-brand-500/5 !border-brand-500/15">
          <div className="flex gap-3">
            <BookOpen className="w-5 h-5 text-brand-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-brand-400 mb-1">
                Naming tip for better coaching
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Name your files like <code className="text-brand-300 bg-brand-500/10 px-1.5 py-0.5 rounded">Framework - Cialdini 6 Principles.pdf</code> and the system will 
                auto-categorize them. Categories include: Book, Framework, Sales, Neuro, 
                Proposal, Presentation, and Coaching.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sources list */}
      {sources.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-3">
            Uploaded Files ({sources.length})
          </h3>
          <div className="space-y-2">
            {sources.map((source) => {
              const statusConfig = STATUS_CONFIG[source.status];
              const StatusIcon = statusConfig.icon;
              return (
                <div
                  key={source.id}
                  className="card !p-4 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-9 h-9 rounded-lg ${statusConfig.bg} flex items-center justify-center flex-shrink-0`}>
                      <StatusIcon className={`w-4 h-4 ${statusConfig.color} ${
                        source.status === 'processing' ? 'animate-spin' : ''
                      }`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="text-sm font-medium text-white truncate">
                          {source.original_name}
                        </h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusConfig.bg} ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{formatFileSize(source.file_size)}</span>
                        {source.category && (
                          <span className="px-1.5 py-0.5 rounded bg-surface-lighter text-gray-400">
                            {source.category}
                          </span>
                        )}
                        {source.chunks_count > 0 && (
                          <span>{source.chunks_count} chunks</span>
                        )}
                        <span>{formatDate(source.created_at)}</span>
                      </div>
                      {source.status === 'failed' && source.error_message && (
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-red-400">
                          <AlertCircle className="w-3 h-3" />
                          {source.error_message}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={() => setDeleteConfirm(source.id)}
                    className="p-2 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
          <div className="card max-w-sm w-full animate-slide-up">
            <h3 className="text-lg font-semibold text-white mb-2">Delete this file?</h3>
            <p className="text-sm text-gray-400 mb-6">
              This will remove the file and all its knowledge chunks. The AI coach
              will no longer reference this content.
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="btn-ghost text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
