import React, { useState, useEffect, useRef } from 'react';
import { getFoundItemComments, addFoundItemComment } from '../../services/api';
import toast from 'react-hot-toast';

const AdminCommentsModal = ({ isOpen, onClose, itemId, itemTitle }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const modalRef = useRef(null);
  const commentsEndRef = useRef(null);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const res = await getFoundItemComments(itemId);
      // Handle both { success: true, data: [] } and direct array
      const commentsList = res?.data || (Array.isArray(res) ? res : []);
      setComments(commentsList);
    } catch (err) {
      toast.error('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && itemId) {
      fetchComments();
    }
  }, [isOpen, itemId]);

  useEffect(() => {
    if (comments.length > 0) {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments]);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleBackdropClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setSubmitting(true);
      const res = await addFoundItemComment(itemId, newComment);
      const updatedComments = res?.data || (Array.isArray(res) ? res : []);
      setComments(updatedComments);
      setNewComment('');
      toast.success('Comment added successfully');
      fetchComments(); // Reload to get populated user details
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={handleBackdropClick}
    >
      <div 
        ref={modalRef}
        className="bg-white w-full max-w-[550px] h-[550px] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-5 text-white flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-lg font-bold">Item Comments</h2>
            <p className="text-indigo-100/90 text-xs mt-0.5 truncate max-w-[350px]">
              Discussion for "{itemTitle}"
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : comments.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
              <svg className="w-12 h-12 mb-2 opacity-55" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-sm font-medium">No comments yet.</p>
              <p className="text-xs">Be the first to post a note or update.</p>
            </div>
          ) : (
            comments.map((c, index) => (
              <div 
                key={c._id || index} 
                className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col"
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-800">
                      {c.user?.fullName || 'System User'}
                    </span>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 tracking-wider">
                      {c.user?.role || 'staff'}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {new Date(c.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                  {c.comment}
                </p>
              </div>
            ))
          )}
          <div ref={commentsEndRef} />
        </div>

        {/* Input Footer */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-slate-100 shrink-0 bg-white flex gap-3">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Type a new comment..."
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl outline-none text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            disabled={submitting}
          />
          <button
            type="submit"
            disabled={submitting || !newComment.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold text-xs uppercase tracking-widest px-5 py-2.5 rounded-xl transition-all active:scale-95 shrink-0"
          >
            Post
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminCommentsModal;
