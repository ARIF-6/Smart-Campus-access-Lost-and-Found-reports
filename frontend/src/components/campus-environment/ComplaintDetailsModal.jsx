import React, { useState, useEffect } from 'react';
import { getComplaintDetails, updateComplaintStatus, assignComplaint } from '../../services/api';
import { toast } from 'react-hot-toast';
import { getImageUrl } from '../../utils/imageUtils';

const CAMPUS_MIN_SUPPORTS = 20;

const ComplaintDetailsModal = ({ complaintId, staffUsers, onClose, onUpdate }) => {
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info'); // info, timeline
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  useEffect(() => {
    if (complaintId) fetchDetails();
  }, [complaintId]);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const data = await getComplaintDetails(complaintId);
      setComplaint(data);
    } catch (error) {
      toast.error('Failed to fetch details');
      onClose();
    } finally {
      setLoading(false);
    }
  };



  if (loading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span className="w-2 h-6 bg-indigo-600 rounded-full"></span>
              Complaint Details
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex border-b border-gray-100 px-6 bg-white">
          {['info', 'timeline'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-4 text-sm font-bold border-b-2 transition-all tracking-wide ${
                activeTab === tab 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-gray-400 hover:text-gray-600'
              } capitalize`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          {activeTab === 'info' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Left Column: Image Gallery & Issue Information */}
              <div className="space-y-8">
                
                {/* Image Gallery */}
                <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Evidence Gallery</h3>
                  {complaint.images && complaint.images.length > 0 ? (
                    <div className="space-y-3">
                      <div className="aspect-video rounded-2xl bg-slate-100 overflow-hidden border border-slate-200 shadow-sm relative group cursor-pointer hover:shadow-md transition-all">
                        <img 
                          src={getImageUrl(complaint.images[selectedImageIdx])} 
                          className="w-full h-full object-contain hover:scale-105 transition-transform duration-500" 
                          alt="Issue" 
                          onClick={() => window.open(getImageUrl(complaint.images[selectedImageIdx]), '_blank')}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center pointer-events-none">
                          <div className="opacity-0 group-hover:opacity-100 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 shadow-sm transition-opacity flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                            Click to Enlarge
                          </div>
                        </div>
                      </div>
                      
                      {complaint.images.length > 1 && (
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                          {complaint.images.map((img, idx) => (
                            <button 
                              key={idx} 
                              onClick={() => setSelectedImageIdx(idx)}
                              className={`w-20 h-16 rounded-xl overflow-hidden flex-shrink-0 transition-all ${
                                selectedImageIdx === idx 
                                ? 'ring-2 ring-indigo-500 ring-offset-2 opacity-100' 
                                : 'opacity-60 hover:opacity-100 border border-slate-200'
                              }`}
                            >
                              <img src={getImageUrl(img)} className="w-full h-full object-cover" alt={`Thumbnail ${idx + 1}`} />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="aspect-video rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                      <svg className="w-10 h-10 mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      <span className="text-xs font-bold uppercase tracking-widest">No images provided</span>
                    </div>
                  )}
                </div>

                {/* Campus Issue Information */}
                <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Campus Issue Information</h3>
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-5">
                    
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Title</span>
                      <p className="text-sm font-black text-slate-800">{complaint.title || complaint.issueType?.issueName || 'Campus Issue'}</p>
                    </div>

                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Description</span>
                      <p className="text-sm text-slate-600 leading-relaxed">{complaint.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Campus</span>
                        <p className="text-sm font-medium text-slate-800">{complaint.campus?.name || complaint.reporter?.campusName || complaint.location || '—'}</p>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Class</span>
                        <p className="text-sm font-medium text-slate-800">{complaint.reporter?.className || '—'}</p>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</span>
                        <span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                          complaint.status === 'resolved' || complaint.status === 'completed' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                          complaint.status === 'in_review' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                          complaint.status === 'rejected' ? 'bg-rose-100 text-rose-700 border-rose-200' :
                          'bg-amber-100 text-amber-700 border-amber-200'
                        }`}>
                          {complaint.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200/60">
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Date Submitted</span>
                        <p className="text-xs font-medium text-slate-600">
                          {new Date(complaint.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Support</span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-100">
                          👍 {complaint.supportCount} Supports
                        </span>
                      </div>
                    </div>

                  </div>
                </div>

              </div>

              {/* Right Column: Reporter Information */}
              <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Reporter Information</h3>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
                  
                  {/* Decorative Background */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100/50 rounded-bl-full -mr-10 -mt-10 pointer-events-none"></div>

                  <div className="flex items-center gap-4 mb-6 relative z-10">
                    <div className="w-16 h-16 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-xl font-black text-indigo-600">
                      {complaint.student?.fullName?.[0] || 'U'}
                    </div>
                    <div>
                      <h4 className="text-base font-black text-slate-800">{complaint.reporter?.fullName || 'Unknown Student'}</h4>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{complaint.reporter?.studentId || 'No ID'}</p>
                    </div>
                  </div>

                  <div className="space-y-4 relative z-10">
                    {[
                      { label: 'Faculty', value: complaint.reporter?.facultyName || '' },
                      { label: 'Department', value: complaint.reporter?.departmentName || '' },
                      { label: 'Class', value: complaint.reporter?.className || '' },
                      { label: 'Hall', value: complaint.reporter?.hallName || '' },
                      { label: 'Campus', value: complaint.reporter?.campusName || complaint.campus?.name || complaint.location || '' },
                    ].map((info, idx) => (
                      <div key={idx} className="flex justify-between items-center py-2.5 border-b border-slate-200/60 last:border-0">
                        <span className="text-xs font-bold text-slate-500">{info.label}</span>
                        <span className="text-sm font-semibold text-slate-800 text-right max-w-[60%] truncate">{info.value}</span>
                      </div>
                    ))}
                  </div>

                </div>
              </div>

            </div>
          )}

          {activeTab === 'timeline' && (
            complaint.tracking?.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                  No status updates yet
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  This complaint is currently pending review.
                </p>
              </div>
            ) : (
              <div className="space-y-8 relative before:absolute before:inset-0 before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-indigo-100 before:via-indigo-100 before:to-transparent">
                
                {/* Initial Submission Card */}
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 border-white bg-indigo-50 text-indigo-600 shadow-sm shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Submitted</span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {new Date(complaint.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 font-medium">Complaint was officially recorded in the system.</p>
                  </div>
                </div>

                {complaint.tracking.map((item, idx) => (
                  <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${(idx + 1) * 150}ms` }}>
                    <div className="flex items-center justify-center w-12 h-12 rounded-full border-4 border-white bg-slate-50 text-slate-400 shadow-sm shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50 px-2 py-0.5 rounded-md">{item.oldStatus.replace('_', ' ')}</span>
                          <svg className="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded-md">{item.newStatus.replace('_', ' ')}</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 text-right shrink-0 ml-2">
                          {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      {item.note && (
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-3 relative">
                          <svg className="absolute top-2 left-2 w-3 h-3 text-slate-300" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" /></svg>
                          <p className="text-xs text-slate-600 font-medium pl-6 leading-relaxed italic">"{item.note}"</p>
                        </div>
                      )}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-50">
                        <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-black text-slate-500">
                          {item.changedBy?.fullName[0] || 'A'}
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">Updated by {item.changedBy?.fullName || 'Admin'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

        </div>
      </div>
    </div>
  );
};

export default ComplaintDetailsModal;
