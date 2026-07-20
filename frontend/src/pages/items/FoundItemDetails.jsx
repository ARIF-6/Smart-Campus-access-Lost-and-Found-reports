import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { getFoundItemById, markItemReturned, deleteFoundItem, linkLostItemToFound, getLostItems } from '../../services/api';
import ClaimItemModal from '../../components/modals/ClaimItemModal';
import EditFoundItemModal from '../../components/modals/EditFoundItemModal';

import toast from 'react-hot-toast';
import { customConfirm } from '../../utils/confirm';
import { getImageUrl } from '../../utils/imageUtils';

const FoundItemDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [lostItemsList, setLostItemsList] = useState([]);
  const [selectedLostId, setSelectedLostId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const fetchItemData = async () => {
    try {
      setLoading(true);
      const itemData = await getFoundItemById(id);
      setItem(itemData);
      
      const lostDataResponse = await getLostItems({ status: 'pending' });
      setLostItemsList(lostDataResponse?.items || (Array.isArray(lostDataResponse) ? lostDataResponse : []));
    } catch (err) {
      setError('Could not locate that item.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItemData();
  }, [id]);

  const handleMarkReturned = async () => {
    // Guard: cannot return while status is pending
    if (item.status === 'pending') {
      toast.error('This item cannot be returned while its status is Pending.');
      return;
    }
    // Guard: cannot return while an ownership claim is active
    if (item.status === 'claimed') {
      toast.error('This item cannot be returned until the ownership claim has been resolved.');
      return;
    }
    try {
      const updatedItem = await markItemReturned(id);
      setItem(updatedItem); 
      fetchItemData();
      toast.success('Item marked as returned successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating item status.');
    }
  };

  const handleDelete = async () => {
    const confirmed = await customConfirm('Are you sure you want to delete this item record permanently?');
    if (confirmed) {
      try {
        await deleteFoundItem(id);
        toast.success('Item record deleted successfully.');
        navigate('/admin/found-items');
      } catch (err) {
        toast.error('Error deleting item.');
      }
    }
  };
  
  const handleLinkLostItem = async () => {
    if (!selectedLostId) return;
    try {
      await linkLostItemToFound(id, selectedLostId);
      fetchItemData();
      toast.success('Items successfully linked.');
    } catch (err) {
      toast.error('Error linking items.');
    }
  }

  if (loading) return (
    <AdminLayout title="Loading Details..."><div className="flex justify-center p-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div></div></AdminLayout>
  );
  
  if (error || !item) return (
    <AdminLayout title="Error"><div className="bg-red-50 text-red-600 p-6 rounded-xl">{error || 'Item not found.'}</div></AdminLayout>
  );

  return (
    <AdminLayout title={`Item Details: ${item.title}`}>
      
      <div className="mb-6 flex justify-between items-center">
        <Link to="/admin/found-items" className="text-emerald-600 hover:text-emerald-800 font-medium flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to Directory
        </Link>
        {!['claimed', 'returned', 'approved'].includes(item.status) ? (
          <button 
            onClick={() => setIsClaimModalOpen(true)}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg shadow-md font-bold hover:bg-blue-700 transition-all flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            Claim This Item
          </button>
        ) : (
          <div className="px-6 py-2.5 bg-gray-100 text-gray-500 rounded-lg border border-gray-200 font-bold flex items-center gap-2 italic">
            This item is already claimed or approved
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3">
          
          <div className="bg-gray-100 flex items-center justify-center p-8 border-b md:border-b-0 md:border-r border-gray-200">
            {(item.image || item.imageUrl) ? (
              <img src={getImageUrl(item)} alt={item.title} className="max-w-full h-auto rounded-xl shadow-sm object-cover" />
            ) : (
              <div className="text-center text-gray-400">
                <svg className="w-32 h-32 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <p>No Image Provided</p>
              </div>
            )}

          </div>

          <div className="md:col-span-2 p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-3xl font-extrabold text-gray-900 leading-tight">{item.title}</h2>
                <span className={`inline-block mt-3 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide
                  ${item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                    item.status === 'claimed' ? 'bg-blue-100 text-blue-800' : 
                    item.status === 'returned' ? 'bg-purple-100 text-purple-800' :
                    'bg-green-100 text-green-800'}`
                }>
                  Status: {item.status}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Date Found</p>
                <p className="text-lg text-gray-800 font-medium">{new Date(item.dateFound).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Description</h3>
              <p className="text-gray-700 bg-gray-50 p-4 rounded-xl border border-gray-100">{item.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
              <div>
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Category</h3>
                <p className="text-gray-800 capitalize font-medium">{item.category}</p>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Location Found</h3>
                <p className="text-gray-800 font-medium">{item.location}</p>
              </div>
              <div>
                 <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Reported By</h3>
                 <p className="text-gray-800 font-medium">{item.createdBy?.fullName || item.createdBy?.name || item.createdBy?.email || ''}</p>
                 <p className="text-sm text-gray-500">{item.createdBy?.email || ''}</p>
              </div>
            </div>

            {/* RENDER FOR RETURNED ITEMS */}
            {item.status === 'returned' && item.currentReturnedStudent && (
              <div className="mb-8 p-6 bg-green-50/50 rounded-2xl border border-green-200/60 shadow-sm animate-in fade-in duration-200">
                <h3 className="text-sm font-black text-green-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Latest Returned Owner (Handed Over)
                </h3>
                
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="w-20 h-20 rounded-2xl border-2 border-green-200 shadow overflow-hidden bg-green-50 shrink-0">
                    {item.currentReturnedStudent.photoUrl ? (
                      <img
                        src={getImageUrl(item.currentReturnedStudent.photoUrl)}
                        alt={item.currentReturnedStudent.fullName}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-green-600 font-black text-2xl">
                        {item.currentReturnedStudent.fullName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs">
                    <div>
                      <span className="block text-[10px] font-bold text-green-500 uppercase tracking-wider">Full Name</span>
                      <span className="text-sm font-bold text-slate-800">{item.currentReturnedStudent.fullName}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-green-500 uppercase tracking-wider">Student ID</span>
                      <span className="text-sm font-mono font-bold text-slate-855">{item.currentReturnedStudent.studentId || '—'}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-green-500 uppercase tracking-wider">Faculty / Dept</span>
                      <span className="text-slate-700 font-semibold">
                        {item.currentReturnedStudent.faculty?.name || item.currentReturnedStudent.faculty || '—'} / {item.currentReturnedStudent.department?.name || item.currentReturnedStudent.department || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-green-500 uppercase tracking-wider">Class / Handover Time</span>
                      <span className="text-slate-700 font-semibold">
                        Class: {item.currentReturnedStudent.class?.name || item.currentReturnedStudent.class || '—'} 
                        {item.returnedAt && ` (Handover: ${new Date(item.returnedAt).toLocaleString()})`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* RENDER FOR ITEMS UNDER OWNERSHIP REVIEW */}
            {item.status === 'under_ownership_review' && (
              <div className="mb-8 p-6 bg-red-50/20 rounded-2xl border border-red-100/80 shadow-sm animate-in fade-in duration-200">
                <h3 className="text-sm font-black text-red-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-650" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  Ownership Dispute Verification — Classify Participants
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* PREVIOUS RETURNED STUDENT */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <span className="inline-block text-[9px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded mb-3">
                      Previous Returned Student
                    </span>
                    {item.currentReturnedStudent ? (
                      <div className="flex gap-4">
                        <div className="w-14 h-14 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 shrink-0">
                          {item.currentReturnedStudent.photoUrl ? (
                            <img
                              src={getImageUrl(item.currentReturnedStudent.photoUrl)}
                              alt={item.currentReturnedStudent.fullName}
                              className="w-full h-full object-cover"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-lg">
                              {item.currentReturnedStudent.fullName.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="space-y-0.5 text-xs text-slate-600">
                          <p className="text-sm font-bold text-slate-800">{item.currentReturnedStudent.fullName}</p>
                          <p className="font-mono">ID: {item.currentReturnedStudent.studentId || '—'}</p>
                          <p>Faculty: {item.currentReturnedStudent.faculty?.name || item.currentReturnedStudent.faculty || '—'}</p>
                          <p>Dept/Class: {item.currentReturnedStudent.department?.name || item.currentReturnedStudent.department || '—'} ({item.currentReturnedStudent.class?.name || item.currentReturnedStudent.class || '—'})</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No previous owner recorded.</p>
                    )}
                  </div>

                  {/* CURRENT CLAIMANT / REPORTER */}
                  <div className="bg-white p-4 rounded-xl border border-indigo-150 shadow-sm">
                    <span className="inline-block text-[9px] font-black uppercase tracking-wider text-indigo-750 bg-indigo-50 px-2 py-0.5 rounded mb-3">
                      Current Ownership Claimant (Reporter)
                    </span>
                    {item.activeDispute?.newClaimant ? (
                      <div className="flex gap-4">
                        <div className="w-14 h-14 rounded-xl border border-indigo-200 overflow-hidden bg-indigo-50 shrink-0">
                          {item.activeDispute.newClaimant.photoUrl ? (
                            <img
                              src={getImageUrl(item.activeDispute.newClaimant.photoUrl)}
                              alt={item.activeDispute.newClaimant.fullName}
                              className="w-full h-full object-cover"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-indigo-400 font-bold text-lg">
                              {item.activeDispute.newClaimant.fullName.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="space-y-0.5 text-xs text-slate-600">
                          <p className="text-sm font-bold text-slate-800">{item.activeDispute.newClaimant.fullName}</p>
                          <p className="font-mono">ID: {item.activeDispute.newClaimant.studentId || '—'}</p>
                          <p>Faculty: {item.activeDispute.newClaimant.faculty?.name || item.activeDispute.newClaimant.faculty || '—'}</p>
                          <p>Dept/Class: {item.activeDispute.newClaimant.department?.name || item.activeDispute.newClaimant.department || '—'} ({item.activeDispute.newClaimant.class?.name || item.activeDispute.newClaimant.class || '—'})</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No claimant information found.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

             <div className="pt-6 border-t border-gray-200 flex flex-wrap gap-4">
                   {item.status !== 'returned' && (
                     <>
                       <button 
                         onClick={() => setIsEditModalOpen(true)}
                         className="px-6 py-2.5 bg-blue-100 text-blue-700 rounded-lg shadow-sm font-semibold hover:bg-blue-200 transition-colors flex items-center gap-2"
                       >
                         <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                         Edit Details
                       </button>
                        {item.status === 'approved' && (
                          <button 
                            onClick={handleMarkReturned}
                            className="px-6 py-2.5 bg-orange-500 text-white rounded-lg shadow-sm font-semibold hover:bg-orange-600 transition-colors flex items-center gap-2"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            Flag as Returned
                          </button>
                        )}
                     </>
                   )}
               <button 
                 onClick={handleDelete}
                 className="px-6 py-2.5 bg-red-100 text-red-700 rounded-lg shadow-sm font-semibold hover:bg-red-200 transition-colors flex items-center gap-2"
                >
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                 Delete Record
               </button>
             </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
         <h3 className="text-lg font-bold text-gray-800 mb-4">Identity Matching & Claims</h3>
         
         {item.possibleMatch ? (
           <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex justify-between items-center">
             <div>
               <p className="font-semibold text-blue-900">Linked to Lost Item Tracker:</p>
               <p className="text-sm text-blue-700">Database ID: {item.possibleMatch._id || item.possibleMatch}</p>
             </div>
             <Link to={`/admin/lost-items/${item.possibleMatch._id || item.possibleMatch}`} className="bg-white text-blue-600 font-medium px-4 py-2 rounded-md shadow-sm border border-blue-200 hover:bg-blue-50">View Lost Record</Link>
           </div>
         ) : (
           <div className="flex flex-col sm:flex-row items-end gap-4">
              <div className="w-full sm:w-80">
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Active Missing File</label>
                <select 
                  className="w-full border-gray-300 rounded-md py-2 px-3 focus:ring-1 focus:border-indigo-500 bg-white"
                  value={selectedLostId}
                  onChange={(e) => setSelectedLostId(e.target.value)}
                >
                   <option value="">-- Choose Missing Item --</option>
                   {lostItemsList.map(lost => (
                     <option key={lost._id} value={lost._id}>{lost.title} (Reported {new Date(lost.createdAt).toLocaleDateString()})</option>
                   ))}
                </select>
              </div>
              <button 
                 onClick={handleLinkLostItem} 
                 disabled={!selectedLostId}
                 className="px-6 py-2 bg-indigo-600 text-white rounded-md font-medium shadow-sm hover:bg-indigo-700 transition disabled:opacity-50"
              >
                 Link Records
              </button>
           </div>
         )}
      </div>

      <ClaimItemModal 
        isOpen={isClaimModalOpen}
        onClose={() => setIsClaimModalOpen(false)}
        itemId={id}
        onSuccess={fetchItemData}
      />

      <EditFoundItemModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={fetchItemData}
        item={item}
      />
    </AdminLayout>
  );
};

export default FoundItemDetails;
