import React, { useState, useEffect, useRef } from 'react';
import { resolveOwnershipReport, addOwnershipReportComment, getOwnershipReportById } from '../../services/api';
import { getImageUrl } from '../../utils/imageUtils';
import toast from 'react-hot-toast';

const OwnershipReportDetailsModal = ({ isOpen, onClose, reportId, onSuccess }) => {
  const [report, setReport] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [resolving, setResolving] = useState(false);
  const modalRef = useRef(null);

  const fetchReportDetails = async () => {
    try {
      setLoading(true);
      const res = await getOwnershipReportById(reportId);
      const data = res?.data || res;
      setReport(data);
      setComments(data?.adminComments || []);
    } catch (err) {
      toast.error('Failed to load report details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && reportId) {
      fetchReportDetails();
    }
  }, [isOpen, reportId]);

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

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setSubmittingComment(true);
      const res = await addOwnershipReportComment(reportId, newComment);
      const updatedComments = res?.data || (Array.isArray(res) ? res : []);
      setComments(updatedComments);
      setNewComment('');
      toast.success('Comment added successfully');
      fetchReportDetails(); // reload to get populated user details
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleResolve = async (status) => {
    const confirmMsg = `Are you sure you want to ${status} this ownership report?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setResolving(true);
      // Pass the current newComment if they typed something in the input box, or empty
      await resolveOwnershipReport(reportId, { status, comment: newComment });
      toast.success(`Report successfully ${status}`);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to resolve report`);
    } finally {
      setResolving(false);
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
        className="bg-white w-full max-w-[650px] rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[85vh] animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-6 text-white flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-bold">Ownership Report Details</h2>
            <p className="text-slate-300 text-xs mt-0.5">
              Review and resolve ownership claims submitted by students
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

        {/* Content Body */}
        {loading || !report ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-800"></div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* NEW CLAIMANT FULL PROFILE CARD */}
            <div className="bg-gradient-to-br from-slate-50 to-indigo-50/30 rounded-2xl border border-slate-200 p-5">
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">New Claimant Profile</h4>

              <div className="flex flex-col sm:flex-row gap-5 mb-5">
                {/* Profile Photo */}
                <div className="w-20 h-20 rounded-2xl border-2 border-indigo-100 shadow overflow-hidden bg-indigo-50 shrink-0">
                  {report.student?.photoUrl ? (
                    <img
                      src={getImageUrl(report.student.photoUrl)}
                      alt={report.student.fullName}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-indigo-400 font-black text-2xl">
                      {(report.student?.fullName || 'S').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Identity Fields */}
                <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                  <div>
                    <span className="block text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Full Name</span>
                    <span className="text-sm font-bold text-slate-800">{report.student?.fullName || '—'}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Student ID</span>
                    <span className="text-sm font-mono font-bold text-slate-800">{report.student?.studentId || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Faculty</span>
                    <span className="text-slate-700 font-semibold">{report.student?.faculty?.name || report.student?.faculty || '—'}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Department</span>
                    <span className="text-slate-700 font-semibold">{report.student?.department?.name || report.student?.department || '—'}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Class</span>
                    <span className="text-slate-700 font-semibold">{report.student?.class?.name || report.student?.class || '—'}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Claim Submitted</span>
                    <span className="text-slate-700 font-semibold">{new Date(report.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Item Info Row */}
              <div className="border-t border-slate-100 pt-4 grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Claimed Item</span>
                  <span className="text-sm font-bold text-slate-800">{report.foundItem?.title || '—'}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Location Found</span>
                  <span className="text-slate-600 font-medium">{report.foundItem?.location || '—'}</span>
                </div>
              </div>
            </div>

            {/* Claim Reason */}
            <div>
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Claim Reason</h4>
              <div className="text-sm text-slate-700 bg-amber-50/50 p-3 rounded-lg border border-amber-100/50 whitespace-pre-wrap leading-relaxed">
                {report.reason}
              </div>
            </div>

            {/* Supporting Comments (Optional) */}
            {report.comments && (
              <div>
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Supporting Evidence / Comments</h4>
                <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 whitespace-pre-wrap leading-relaxed">
                  {report.comments}
                </div>
              </div>
            )}

            {/* Decision Status Banner */}
            <div className="flex items-center gap-3">
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Report Status:</h4>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                report.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                report.status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' :
                'bg-red-100 text-red-800 border-red-200'
              }`}>
                {report.status}
              </span>
            </div>

            {/* Admin Comments section */}
            <div className="border-t border-slate-100 pt-5">
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-3">Resolution discussion / comments</h4>
              
              {comments.length === 0 ? (
                <p className="text-xs text-slate-400 italic mb-4">No comments posted yet.</p>
              ) : (
                <div className="space-y-3 mb-4 max-h-[180px] overflow-y-auto pr-2">
                  {comments.map((c, idx) => (
                    <div key={c._id || idx} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-800">{c.user?.fullName || 'Admin'}</span>
                          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-bold">{c.user?.role || 'admin'}</span>
                        </div>
                        <span className="text-[9px] text-slate-400 font-mono">{new Date(c.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-slate-600 whitespace-pre-wrap">{c.comment}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Post comment/note form */}
              <form onSubmit={handlePostComment} className="flex gap-2">
                <input 
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Enter comments/notes here..."
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800"
                />
                <button
                  type="submit"
                  disabled={submittingComment || !newComment.trim()}
                  className="bg-slate-700 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold text-[10px] uppercase tracking-wider px-4 py-2 rounded-xl transition-all"
                >
                  Add Comment
                </button>
              </form>
            </div>

          </div>
        )}

        {/* Footer Actions */}
        {report && report.status === 'pending' && !loading && (
          <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex justify-between gap-3 shrink-0">
            <button
              onClick={() => handleResolve('rejected')}
              disabled={resolving}
              className="px-5 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-red-100 transition-all disabled:opacity-50"
            >
              Reject Claim
            </button>
            <button
              onClick={() => handleResolve('approved')}
              disabled={resolving}
              className="px-5 py-2.5 bg-green-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-green-700 shadow-md shadow-green-100 transition-all disabled:opacity-50"
            >
              Approve Claim
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnershipReportDetailsModal;
