import React, { useState, useEffect, useRef } from 'react';
import { getOwnershipDisputeById, resolveOwnershipDispute } from '../../services/api';
import toast from 'react-hot-toast';
import { getImageUrl } from '../../utils/imageUtils';

import { customConfirm } from '../../utils/confirm';

const OwnershipDisputeDetailsModal = ({ isOpen, onClose, disputeId, onSuccess }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [reason, setReason] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState(null); // 'original' | 'new'
  const modalRef = useRef(null);

  const fetchDisputeDetails = async () => {
    try {
      setLoading(true);
      const res = await getOwnershipDisputeById(disputeId);
      setData(res?.data || res);
    } catch (err) {
      toast.error('Failed to load dispute details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && disputeId) {
      fetchDisputeDetails();
      setReason('');
      setSelectedRecipient(null);
    }
  }, [isOpen, disputeId]);

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

  const handleResolve = async (decision) => {
    const decisionText = decision === 'original' 
      ? 'confirm the original student as the owner' 
      : 'transfer ownership to the new claimant';

    const confirmMsg = `Are you sure you want to ${decisionText}?`;
    const confirmed = await customConfirm(confirmMsg);
    if (!confirmed) return;

    try {
      setResolving(true);
      await resolveOwnershipDispute(disputeId, {
        decision,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      });
      toast.success(`Dispute successfully resolved`);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resolve dispute');
    } finally {
      setResolving(false);
    }
  };

  if (!isOpen) return null;

  const dispute = data?.dispute;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={handleBackdropClick}
    >
      <div 
        ref={modalRef}
        className="bg-white w-full max-w-[800px] rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[90vh] animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
      >
        {/* Header */}
        <div className="bg-[#07073c] px-6 py-6 text-white flex justify-between items-center shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-red-600 text-[9px] font-black uppercase tracking-widest rounded">Ownership Dispute</span>
              <h2 className="text-xl font-bold">Investigation & Resolution</h2>
            </div>
            <p className="text-slate-300 text-xs mt-0.5">
              Review claim timelines, claimant profiles, and make a final verification decision.
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
        {loading || !dispute ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-800"></div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Found Item Main Info */}
            <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 flex items-start gap-4">
              <div className="bg-red-100 p-3 rounded-lg text-red-800 shrink-0">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-800">{dispute.foundItem?.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Location Found: {dispute.foundItem?.location}</p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    STATUS: UNDER OWNERSHIP REVIEW
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Disputed on: {new Date(dispute.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Comparison Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* ORIGINAL RECEIVER */}
              <div 
                onClick={() => dispute.status === 'pending' && setSelectedRecipient('original')}
                className={`rounded-xl p-5 shadow-sm relative overflow-hidden flex gap-4 transition-all duration-205 ${
                  dispute.status === 'pending' ? 'cursor-pointer hover:border-slate-400' : ''
                } ${
                  selectedRecipient === 'original' 
                    ? 'border-2 border-emerald-600 ring-4 ring-emerald-50 bg-emerald-50/20 shadow-md' 
                    : 'bg-white border border-slate-200'
                }`}
              >
                {selectedRecipient === 'original' && (
                  <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-sm z-10">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                <div className={`absolute top-0 right-0 px-3 py-1 text-[9px] font-black uppercase tracking-wider rounded-bl-lg transition-colors ${
                  selectedRecipient === 'original' ? 'bg-emerald-600 text-white' : 'bg-slate-150 text-slate-650'
                }`}>
                  Original Returned Student
                </div>
                <div className="w-16 h-16 rounded-xl border border-slate-200 overflow-hidden bg-slate-100 mt-4 shrink-0">
                  {dispute.originalReturnedStudent?.photoUrl ? (
                    <img
                      src={getImageUrl(dispute.originalReturnedStudent.photoUrl)}
                      alt={dispute.originalReturnedStudent?.fullName}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xl">
                      {(dispute.originalReturnedStudent?.fullName || 'O').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 mt-4">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Student Profile</h4>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-800">{dispute.originalReturnedStudent?.fullName || 'N/A'}</p>
                    <p className="text-xs text-slate-600 font-medium">Student ID: <span className="font-mono">{dispute.originalReturnedStudent?.studentId || 'N/A'}</span></p>
                    <p className="text-xs text-slate-600">Faculty/Dept: {dispute.originalReturnedStudent?.faculty?.name || dispute.originalReturnedStudent?.faculty || '—'} / {dispute.originalReturnedStudent?.department?.name || dispute.originalReturnedStudent?.department || '—'}</p>
                    <p className="text-xs text-slate-600">Class: {dispute.originalReturnedStudent?.class?.name || dispute.originalReturnedStudent?.class || '—'}</p>
                    {dispute.foundItem?.returnedAt && (
                      <p className="text-[10px] text-slate-400 font-semibold mt-1">Returned: {new Date(dispute.foundItem.returnedAt).toLocaleString()}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* NEW CLAIMANT */}
              <div 
                onClick={() => dispute.status === 'pending' && setSelectedRecipient('new')}
                className={`rounded-xl p-5 shadow-sm relative overflow-hidden flex gap-4 transition-all duration-205 ${
                  dispute.status === 'pending' ? 'cursor-pointer hover:border-indigo-400' : ''
                } ${
                  selectedRecipient === 'new' 
                    ? 'border-2 border-indigo-600 ring-4 ring-indigo-50 bg-indigo-50/20 shadow-md' 
                    : 'bg-white border border-slate-200'
                }`}
              >
                {selectedRecipient === 'new' && (
                  <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-sm z-10">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                <div className={`absolute top-0 right-0 px-3 py-1 text-[9px] font-black uppercase tracking-wider rounded-bl-lg transition-colors ${
                  selectedRecipient === 'new' ? 'bg-indigo-650 text-white' : 'bg-indigo-100 text-indigo-700'
                }`}>
                  New Approved Owner
                </div>
                <div className="w-16 h-16 rounded-xl border border-indigo-200 overflow-hidden bg-indigo-50 mt-4 shrink-0">
                  {dispute.newClaimant?.photoUrl ? (
                    <img
                      src={getImageUrl(dispute.newClaimant.photoUrl)}
                      alt={dispute.newClaimant?.fullName}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-indigo-400 font-bold text-xl">
                      {(dispute.newClaimant?.fullName || 'N').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 mt-4">
                  <h4 className="text-[10px] font-black uppercase text-indigo-450 tracking-wider mb-1">Student Profile</h4>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-800">{dispute.newClaimant?.fullName || 'N/A'}</p>
                    <p className="text-xs text-slate-655 font-medium">Student ID: <span className="font-mono">{dispute.newClaimant?.studentId || 'N/A'}</span></p>
                    <p className="text-xs text-slate-600">Faculty/Dept: {dispute.newClaimant?.faculty?.name || dispute.newClaimant?.faculty || '—'} / {dispute.newClaimant?.department?.name || dispute.newClaimant?.department || '—'}</p>
                    <p className="text-xs text-slate-600">Class: {dispute.newClaimant?.class?.name || dispute.newClaimant?.class || '—'}</p>
                    {dispute.status === 'resolved_new' && dispute.adminDecision?.resolvedAt && (
                      <p className="text-[10px] text-green-600 font-semibold mt-1">Transferred: {new Date(dispute.adminDecision.resolvedAt).toLocaleString()}</p>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* Claimant Reason */}
            <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
              <h4 className="text-[10px] font-black uppercase text-indigo-700 tracking-wider mb-1.5">New Claimant's Statement</h4>
              <p className="text-sm text-slate-800 leading-relaxed font-medium">"{dispute.ownershipReport?.reason}"</p>
              {dispute.ownershipReport?.comments && (
                <div className="mt-3 pt-3 border-t border-indigo-100/80 text-xs text-slate-500">
                  <span className="font-bold">Additional Comments:</span> {dispute.ownershipReport.comments}
                </div>
              )}
            </div>

            {dispute.status === 'pending' && (
              <div className="border-t border-slate-100 pt-5 space-y-4">
                <h4 className="text-[10px] font-black uppercase text-red-650 tracking-wider">Resolution Verification Details</h4>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Decision Reason (Optional, displayed to students)
                  </label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Claimant provided corresponding invoice / original student confirmed they collected in error..."
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-slate-850 focus:ring-1 focus:ring-slate-850"
                  />
                </div>
              </div>
            )}

            {dispute.status !== 'pending' && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Admin Resolution Record</h4>
                <p className="text-xs text-slate-700"><span className="font-bold">Decision:</span> {dispute.status.replace('_', ' ').toUpperCase()}</p>
                {dispute.adminDecision?.reason && (
                  <p className="text-xs text-slate-700"><span className="font-bold">Reason:</span> {dispute.adminDecision.reason}</p>
                )}
                {dispute.adminDecision?.comment && (
                  <p className="text-xs text-slate-500"><span className="font-bold">Comment:</span> {dispute.adminDecision.comment}</p>
                )}
                <p className="text-[10px] text-slate-450 font-mono">Resolved by: {dispute.adminDecision?.resolvedBy?.fullName} on {new Date(dispute.adminDecision?.resolvedAt).toLocaleString()}</p>
              </div>
            )}

          </div>
        )}

        {/* Footer Actions */}
        {dispute && dispute.status === 'pending' && !loading && (
          <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex items-center justify-between gap-3 shrink-0">
            <span className="text-xs text-slate-500 font-medium">
              {!selectedRecipient ? (
                <span className="text-red-500 font-bold">⚠️ Select a student profile above</span>
              ) : (
                <span>Recipient selected: <span className="font-bold capitalize text-slate-800">{selectedRecipient === 'original' ? 'Original Recipient' : 'New Claimant'}</span></span>
              )}
            </span>
            <button
              onClick={() => handleResolve(selectedRecipient)}
              disabled={resolving || !selectedRecipient}
              className="px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md transition-all disabled:opacity-50"
            >
              Give Item
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnershipDisputeDetailsModal;
