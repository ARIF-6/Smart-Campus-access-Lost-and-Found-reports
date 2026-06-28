import React, { useState, useEffect } from 'react';
import { getClassIssueDetails, updateClassIssueStatus, assignClassIssue } from '../../services/api';
import { toast } from 'react-hot-toast';
import { getImageUrl } from '../../utils/imageUtils';

/* ─────────────────────────────────────────────────── helpers ── */
const STATUS_STYLES = {
  pending:   'bg-amber-50 text-amber-700 border-amber-200',
  in_review: 'bg-blue-50 text-blue-700 border-blue-200',
  resolved:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
  rejected:  'bg-rose-50 text-rose-700 border-rose-200',
};

const fmt = (date) =>
  date
    ? new Date(date).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null;

/* ── Reusable labeled field row ── */
const Field = ({ icon, label, value, mono = false }) => (
  <div className="flex items-start gap-3 py-3 border-b border-slate-50 last:border-0">
    {icon && (
      <div className="mt-0.5 w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 flex-shrink-0">
        {icon}
      </div>
    )}
    <div className="min-w-0">
      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">{label}</div>
      <div className={`text-sm break-words ${mono ? 'font-mono' : 'font-semibold'} ${value ? 'text-slate-800' : 'text-slate-300 font-normal italic'}`}>
        {value || 'Not available'}
      </div>
    </div>
  </div>
);

/* ── Skeleton pulse ── */
const Pulse = ({ w = 'w-full', h = 'h-4', extra = '' }) => (
  <div className={`${w} ${h} ${extra} bg-slate-100 rounded-lg animate-pulse`} />
);

/* ─────────────────────────────────── tabs config ── */
const TABS = [
  { id: 'reporter', label: 'Reporter Info' },
  { id: 'issue',    label: 'Issue Details' },
  { id: 'support',  label: 'Support' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'manage',   label: 'Manage' },
];

/* ═══════════════════════════════════════════════════ modal ══ */
const ClassIssueDetailsModal = ({ issueId, staffUsers, onClose, onUpdate }) => {
  const [issue,      setIssue]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState('reporter');
  const [updating,   setUpdating]   = useState(false);
  const [updateData, setUpdateData] = useState({ status: '', note: '' });

  useEffect(() => { if (issueId) fetchDetails(); }, [issueId]);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const data = await getClassIssueDetails(issueId);
      setIssue(data);
      setUpdateData({ status: data.status || 'pending', note: '' });
    } catch {
      toast.error('Failed to fetch issue details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    try {
      setUpdating(true);
      await updateClassIssueStatus(issueId, updateData);
      toast.success('Status updated');
      fetchDetails();
      onUpdate();
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleAssign = async (userId) => {
    try {
      setUpdating(true);
      await assignClassIssue(issueId, userId);
      toast.success('Issue assigned');
      fetchDetails();
      onUpdate();
    } catch {
      toast.error('Failed to assign issue');
    } finally {
      setUpdating(false);
    }
  };

  if (!issueId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl shadow-slate-900/20 flex flex-col overflow-hidden">

        {/* ══ Gradient Header ══ */}
        <div className="px-8 py-5 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-t-3xl flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0">
            {loading ? (
              <div className="space-y-2">
                <Pulse w="w-48" h="h-5" />
                <Pulse w="w-32" h="h-3.5" />
              </div>
            ) : (
              <>
                <h2 className="text-lg font-black text-white leading-tight truncate">{issue?.title}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${STATUS_STYLES[issue?.status] || 'bg-white/10 text-white border-white/20'}`}>
                    {issue?.status?.replace('_', ' ')}
                  </span>
                  {issue?.issueType?.issueName && (
                    <span className="text-indigo-200 text-xs font-semibold">{issue.issueType.issueName}</span>
                  )}
                  <span className="text-indigo-200 text-xs">·</span>
                  <span className="text-indigo-100 text-xs font-bold">
                    Support Count: {issue?.supportCount ?? 0}
                  </span>
                </div>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-9 h-9 bg-white/15 hover:bg-white/25 rounded-xl flex items-center justify-center text-white transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ══ Tabs ══ */}
        <div className="px-6 bg-slate-50/60 border-b border-slate-100 flex gap-0 overflow-x-auto shrink-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-4 text-xs font-bold whitespace-nowrap transition-all relative flex items-center gap-1.5 ${
                activeTab === tab.id ? 'text-indigo-700' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <span>{tab.label}</span>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* ══ Tab Body ══ */}
        <div className="flex-1 overflow-y-auto">

          {/* ──────────── loading skeleton ──────────── */}
          {loading && (
            <div className="p-8 space-y-5">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="flex items-start gap-4">
                  <Pulse w="w-8" h="h-8" extra="rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2 pt-1">
                    <Pulse w="w-20" h="h-3" />
                    <Pulse w={i % 2 === 0 ? 'w-48' : 'w-64'} h="h-4" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ──────────── REPORTER INFO TAB ──────────── */}
          {!loading && activeTab === 'reporter' && (
            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-5">

              {/* Left — Student card */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Avatar banner */}
                <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 px-6 py-5 flex items-center gap-4 border-b border-slate-100">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-indigo-200 shrink-0">
                    {issue?.student?.fullName?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <div className="text-base font-black text-slate-800 truncate">
                      {issue?.student?.fullName || 'Unknown Student'}
                    </div>
                    <div className="text-xs text-slate-500 font-semibold mt-0.5">
                      ID: {issue?.student?.studentId || 'N/A'}
                    </div>
                    <div className="mt-2">
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md text-[10px] font-black uppercase tracking-widest">
                        Class Leader
                      </span>
                    </div>
                  </div>
                </div>

                {/* Fields — all from database */}
                <div className="px-5 divide-y divide-slate-50">
                  <Field label="Faculty"      value={issue?.student?.facultyName || issue?.facultyName}       />
                  <Field label="Department"   value={issue?.student?.departmentName || issue?.departmentName}    />
                  <Field label="Class"        value={issue?.className}              />
                  <Field label="Hall"         value={issue?.hallName || issue?.building} />
                  <Field label="Email"        value={issue?.student?.email}         />
                  <Field label="Phone"        value={issue?.student?.phone}         />
                </div>
              </div>

              {/* Right — Quick-view snapshot */}
              <div className="flex flex-col gap-4">
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
                  <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">Reported Issue</div>
                  <div className="text-sm font-black text-indigo-900 mb-2 leading-snug">{issue?.title}</div>
                  <p className="text-xs text-indigo-700/80 leading-relaxed line-clamp-4">{issue?.description}</p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {issue?.issueType?.issueName && (
                      <span className="px-2.5 py-1 bg-white border border-indigo-200 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                        {issue.issueType.issueName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white border border-slate-100 rounded-2xl p-4 text-center shadow-sm">
                    <div className="text-2xl font-black text-indigo-700">{issue?.supportCount ?? 0}</div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Supports</div>
                  </div>
                  <div className="bg-white border border-slate-100 rounded-2xl p-4 text-center shadow-sm">
                    <div className="text-2xl font-black text-slate-700">{issue?.tracking?.length ?? 0}</div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Updates</div>
                  </div>
                  <div className="bg-white border border-slate-100 rounded-2xl p-4 text-center shadow-sm">
                    <div className="text-2xl font-black text-slate-700">{issue?.images?.length ?? 0}</div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Photos</div>
                  </div>
                </div>

                {/* Current status */}
                <div className={`rounded-2xl border px-5 py-4 ${STATUS_STYLES[issue?.status] || 'bg-slate-50 border-slate-100'}`}>
                  <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Current Status</div>
                  <div className="text-base font-black capitalize">{issue?.status?.replace('_', ' ')}</div>
                  {issue?.assignedTo?.fullName && (
                    <div className="text-xs font-semibold opacity-70 mt-1">
                      Assigned to: {issue.assignedTo.fullName}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ──────────── ISSUE DETAILS TAB ──────────── */}
          {!loading && activeTab === 'issue' && (
            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-5">

              {/* Left — Issue meta */}
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 bg-slate-50/50 border-b border-slate-100">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Issue Content</div>
                  </div>
                  <div className="p-5">
                    <h3 className="text-base font-black text-slate-800 mb-2">{issue?.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{issue?.description}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {issue?.issueType?.issueName && (
                        <span className="px-3 py-1 bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                          {issue.issueType.issueName}
                        </span>
                      )}
                      {issue?.issueType?.category && (
                        <span className="px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                          {issue.issueType.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 divide-y divide-slate-50">
                  <Field label="Support Count"     value={`${issue?.supportCount ?? 0} students supported this issue`} />
                  <Field label="Hall / Location"   value={issue?.hallName || issue?.building} />
                  <Field label="Classroom / Room"  value={issue?.classroom}  />
                  <Field label="Date Submitted"    value={fmt(issue?.createdAt)} />
                  <Field label="Last Updated"      value={fmt(issue?.updatedAt)} />
                  <Field label="Assigned Staff"    value={issue?.assignedTo?.fullName} />
                </div>
              </div>

              {/* Right — Photos */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Evidence Photos
                  </div>
                  {issue?.images?.length > 0 && (
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded-md text-[10px] font-black">
                      {issue.images.length} photo{issue.images.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="p-5">
                  {issue?.images?.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {issue.images.map((img, i) => (
                        <a
                          key={i}
                          href={getImageUrl(img)}
                          target="_blank"
                          rel="noreferrer"
                          className="aspect-square rounded-xl overflow-hidden group relative border border-slate-100 block bg-slate-100"
                        >
                          <img
                            src={getImageUrl(img)}
                            alt={`Evidence photo ${i + 1}`}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-indigo-900/0 group-hover:bg-indigo-900/30 transition-colors flex items-center justify-center">
                            <svg className="w-7 h-7 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </div>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="py-14 flex flex-col items-center text-slate-300 gap-3 border-2 border-dashed border-slate-100 rounded-xl">
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-slate-400">No photos attached</p>
                        <p className="text-xs text-slate-300 mt-1">Student did not upload any images</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ──────────── SUPPORT TAB ──────────── */}
          {!loading && activeTab === 'support' && (
            <div className="p-6 space-y-5">
              {/* Hero total */}
              <div className="bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 rounded-2xl p-8 flex flex-col items-center">
                <div className="text-7xl font-black text-indigo-700 leading-none">
                  {issue?.supportCount ?? 0}
                </div>
                <div className="text-base font-bold text-indigo-500 mt-3">Total Community Supports</div>
                <p className="text-xs text-indigo-400 mt-1 text-center max-w-xs">
                  Fellow students who have marked this issue as important
                </p>
              </div>

              {/* Supporter list */}
              {issue?.supportedBy?.length > 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Supporters
                    </div>
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-md text-[10px] font-black">
                      {issue.supportedBy.length} student{issue.supportedBy.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
                    {issue.supportedBy.map((s, i) => (
                      <div key={s._id || i} className="px-5 py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-sm shrink-0">
                            {s.fullName?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-700 truncate">{s.fullName || '—'}</div>
                            <div className="text-xs text-slate-400 truncate">
                              {[s.department, s.studentId].filter(Boolean).join(' · ') || 'Student'}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 px-2.5 py-1 rounded-lg shrink-0">Supported</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-2xl border border-slate-100 py-12 flex flex-col items-center gap-2">
                  <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  <p className="font-bold text-slate-400">
                    {(issue?.supportCount ?? 0) > 0
                      ? `${issue.supportCount} supports recorded`
                      : 'No supports yet'}
                  </p>
                  <p className="text-xs text-slate-300 text-center">
                    {(issue?.supportCount ?? 0) > 0
                      ? 'Supporter profiles are not stored with full details'
                      : 'Students can support this issue via the mobile app'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ──────────── TIMELINE TAB ──────────── */}
          {!loading && activeTab === 'timeline' && (
            <div className="p-6">
              {issue?.tracking?.length > 0 ? (
                <div className="relative pl-6">
                  <div className="absolute left-[18px] top-4 bottom-4 w-0.5 bg-slate-100" />
                  <div className="space-y-5">
                    {issue.tracking.map((item, i) => (
                      <div key={i} className="flex gap-4 relative">
                        <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center z-10 -ml-3.5 ${
                          i === 0 ? 'bg-indigo-600 shadow-md shadow-indigo-200' : 'bg-white border-2 border-slate-200'
                        }`}>
                          <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-white' : 'bg-slate-300'}`} />
                        </div>
                        <div className="flex-1 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm mb-1">
                          <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${STATUS_STYLES[item.newStatus] || 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                                {item.newStatus?.replace('_', ' ')}
                              </span>
                              {item.oldStatus && (
                                <span className="text-[10px] text-slate-300">
                                  from {item.oldStatus?.replace('_', ' ')}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-semibold whitespace-nowrap">
                              {fmt(item.createdAt)}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-slate-600">
                            By: <span className="text-slate-800">{item.changedBy?.fullName || 'System'}</span>
                            {item.changedBy?.role && <span className="text-slate-400 ml-1">({item.changedBy.role})</span>}
                          </div>
                          {item.note && (
                            <div className="mt-2 bg-slate-50 rounded-xl p-3 text-xs text-slate-600 italic border border-slate-100">
                              "{item.note}"
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-16 flex flex-col items-center gap-3">
                  <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p className="font-bold text-slate-400">No tracking history</p>
                  <p className="text-sm text-slate-300">Status updates will appear here as the issue progresses</p>
                </div>
              )}
            </div>
          )}

          {/* ──────────── MANAGE TAB ──────────── */}
          {!loading && activeTab === 'manage' && (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* Update status */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 bg-slate-50/60 border-b border-slate-100">
                  <div className="text-sm font-black text-slate-700">Update Status</div>
                  <div className="text-xs text-slate-400 mt-0.5">Change the progress of this issue</div>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">New Status</label>
                    <select
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-300 outline-none transition-all"
                      value={updateData.status}
                      onChange={(e) => setUpdateData({ ...updateData, status: e.target.value })}
                    >
                      <option value="pending">Pending</option>
                      <option value="in_review">In Review</option>
                      <option value="resolved">Resolved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Note (optional)</label>
                    <textarea
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-300 outline-none h-28 resize-none transition-all"
                      placeholder="Reason for status change..."
                      value={updateData.note}
                      onChange={(e) => setUpdateData({ ...updateData, note: e.target.value })}
                    />
                  </div>
                  <button
                    onClick={handleUpdateStatus}
                    disabled={updating}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-sm shadow-lg shadow-indigo-200 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updating ? 'Saving…' : '✓ Save Status Update'}
                  </button>
                </div>
              </div>

              {/* Assign staff */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 bg-slate-50/60 border-b border-slate-100">
                  <div className="text-sm font-black text-slate-700">Assign Staff</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {issue?.assignedTo
                      ? `Currently assigned: ${issue.assignedTo.fullName}`
                      : 'No staff assigned yet'}
                  </div>
                </div>
                <div className="p-3 max-h-80 overflow-y-auto space-y-1.5">
                  {staffUsers.length === 0 ? (
                    <div className="py-10 text-center text-sm text-slate-400">No staff members found</div>
                  ) : (
                    staffUsers.map((user) => {
                      const isAssigned = issue?.assignedTo?._id === user._id;
                      return (
                        <div
                          key={user._id}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                            isAssigned
                              ? 'bg-indigo-50 border-indigo-200'
                              : 'bg-white border-slate-100 hover:border-indigo-100 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                              isAssigned ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {user.fullName.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-slate-700 truncate">{user.fullName}</div>
                              {user.email && <div className="text-xs text-slate-400 truncate">{user.email}</div>}
                            </div>
                          </div>
                          <button
                            onClick={() => handleAssign(user._id)}
                            disabled={updating || isAssigned}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black shrink-0 transition-all ${
                              isAssigned
                                ? 'text-indigo-600 cursor-default'
                                : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-indigo-600 hover:text-white hover:border-transparent'
                            }`}
                          >
                            {isAssigned ? '✓ Assigned' : 'Assign'}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ══ Footer ══ */}
        <div className="shrink-0 px-8 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-[10px] text-slate-300 font-semibold truncate">
            {issue?._id ? `Issue ID: ${issue._id}` : ''}
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClassIssueDetailsModal;
