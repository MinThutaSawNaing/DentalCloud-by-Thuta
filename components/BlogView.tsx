import React, { useMemo, useState } from 'react';
import { Plus, Edit2, Trash2, Eye, EyeOff, FileText, Loader2 } from 'lucide-react';
import { BlogPost } from '../types';

interface BlogViewProps {
  posts: BlogPost[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (post: BlogPost) => void;
  onDelete: (id: string) => void;
  onTogglePublish: (post: BlogPost, published: boolean) => void;
}

const BlogView: React.FC<BlogViewProps> = ({
  posts,
  loading,
  onAdd,
  onEdit,
  onDelete,
  onTogglePublish
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');

  const filteredPosts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return posts.filter(post => {
      const matchesTerm = !term
        || post.title.toLowerCase().includes(term)
        || post.content.toLowerCase().includes(term)
        || (post.author || '').toLowerCase().includes(term);
      const matchesStatus = statusFilter === 'all'
        || (statusFilter === 'published' && post.published)
        || (statusFilter === 'draft' && !post.published);
      return matchesTerm && matchesStatus;
    });
  }, [posts, searchTerm, statusFilter]);

  const formatDate = (value?: string) => {
    if (!value) return 'Unknown date';
    const date = new Date(value);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getExcerpt = (value: string, limit = 180) => {
    const normalized = value.replace(/\s+/g, ' ').trim();
    if (normalized.length <= limit) return normalized;
    return `${normalized.slice(0, limit).trimEnd()}...`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Clinic Blog</h2>
          <p className="text-sm text-gray-500">Publish updates, tips, and announcements for patients.</p>
        </div>
        <button
          onClick={onAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold shadow-lg shadow-indigo-600/25 hover:bg-indigo-500 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Post
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="flex-1">
          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Search</label>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title, content, or author"
            className="w-full border-gray-200 border rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-gray-300"
          />
        </div>
        <div className="lg:w-56">
          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'published' | 'draft')}
            className="w-full border-gray-200 border rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
          >
            <option value="all">All Posts</option>
            <option value="published">Published</option>
            <option value="draft">Drafts</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 flex items-center justify-center gap-3 text-gray-500 text-sm font-medium">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading blog posts...
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
            <FileText className="w-6 h-6 text-indigo-500" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">No blog posts yet</h3>
          <p className="text-sm text-gray-500">Create your first post to share updates with patients.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredPosts.map(post => (
            <div key={post.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {post.image_url && (
                    <div className="mb-3">
                      <img
                        src={post.image_url}
                        alt={post.title}
                        className="w-full max-h-48 rounded-2xl object-cover border border-gray-100"
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-lg font-semibold text-gray-900">{post.title}</h3>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${
                      post.published ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {post.published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {post.author ? `By ${post.author} • ` : ''}
                    {formatDate(post.published_at || post.created_at)}
                  </p>
                  <p className="text-sm text-gray-600 mt-3">{getExcerpt(post.content)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => onTogglePublish(post, !post.published)}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                      post.published
                        ? 'border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100'
                        : 'border-green-200 text-green-700 bg-green-50 hover:bg-green-100'
                    }`}
                  >
                    {post.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {post.published ? 'Unpublish' : 'Publish'}
                  </button>
                  <button
                    onClick={() => onEdit(post)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(post.id)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BlogView;
