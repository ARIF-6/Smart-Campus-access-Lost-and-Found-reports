import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { getLostItemById, deleteLostItem, getMatchesForLostItem } from '../../services/api';
import EditLostItemModal from '../../components/modals/EditLostItemModal';

import toast from 'react-hot-toast';
import { customConfirm } from '../../utils/confirm';
import { getImageUrl } from '../../utils/imageUtils';

const LostItemDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [itemData, matchesData] = await Promise.all([
          getLostItemById(id),
          getMatchesForLostItem(id)
        ]);
        setItem(itemData);
        setMatches(matchesData);
      } catch (err) {
        setError('Could not locate that item report.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleDelete = async () => {
    const confirmed = await customConfirm('Are you sure you want to delete this lost item report?');
    if (confirmed) {
      try {
        await deleteLostItem(id);
        toast.success('Report deleted successfully');
        navigate('/admin/lost-items');
      } catch (err) {
        toast.error(err.response?.data?.message || 'Error deleting item.');
      }
    }
  };

  if (loading) return (
    <AdminLayout title="Loading Details..."><div className="flex justify-center p-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div></div></AdminLayout>
  );

  if (error || !item) return (
    <AdminLayout title="Error"><div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-200">{error || 'Item not found.'}</div></AdminLayout>
  );

  return (
    <AdminLayout title="Lost Item Details">
      <div className="mb-8">
        <Link
          to="/admin/lost-items"
          className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors bg-indigo-50/50 hover:bg-indigo-50 px-4 py-2 rounded-xl"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Directory
        </Link>
      </div>

      <div className="bg-white rounded-3xl shadow-xl shadow-gray-100/50 border border-gray-100 overflow-hidden mb-10">
        <div className="grid grid-cols-1 lg:grid-cols-12">

          {/* Image Display Panel */}
          <div className="lg:col-span-5 bg-gray-50/50 flex flex-col items-center justify-center p-8 border-b lg:border-b-0 lg:border-r border-gray-100 min-h-[350px]">
            {item.image || item.imageUrl ? (
              <div className="relative group overflow-hidden rounded-2xl shadow-lg border border-gray-200/50 max-w-full">
                <img
                  src={getImageUrl(item)}
                  alt={item.category}
                  className="w-full h-auto object-cover max-h-[400px] transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
              </div>
            ) : (
              <div className="text-center p-12 bg-white rounded-2xl border border-dashed border-gray-200 w-full flex flex-col items-center justify-center">
                <div className="p-4 bg-gray-50 rounded-full mb-3 text-gray-400">
                  <svg className="w-16 h-16 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="font-semibold text-gray-400 text-sm">No Image Provided</p>
              </div>
            )}
          </div>

          {/* Content Details Panel */}
          <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-between">
            <div>
              {/* Badge Row */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <div className="flex gap-2">
                  <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-sm border
                    ${item.status === 'lost' || item.status === 'pending' ? 'bg-red-50 text-red-700 border-red-100' :
                      item.status === 'matched' || item.status === 'approved' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                        'bg-green-50 text-green-700 border-green-100'}`
                  }>
                    {item.status}
                  </span>
                  <span className="px-4 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-xs font-black uppercase tracking-wider shadow-sm">
                    {item.category}
                  </span>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Date Reported</span>
                  <span className="text-sm text-gray-700 font-bold bg-gray-50 px-3 py-1 rounded-lg border border-gray-100">
                    {new Date(item.dateLost || item.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                  </span>
                </div>
              </div>

              {/* Description Section */}
              <div className="mb-8">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Item Description</h3>
                <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 text-gray-700 leading-relaxed text-sm shadow-inner min-h-[100px]">
                  {item.description}
                </div>
              </div>

              {/* Location & Reported Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-4 hover:border-indigo-100 transition-colors">
                  <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Last Seen Location</span>
                    <span className="text-gray-900 font-extrabold text-sm">{item.location}</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-4 hover:border-indigo-100 transition-colors">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Reported By</span>
                    <span className="text-gray-900 font-extrabold text-sm block truncate max-w-[180px]">
                      {item.createdBy?.fullName || item.createdBy?.name || item.createdBy?.email || 'N/A'}
                    </span>
                    <span className="text-xs text-gray-400 block truncate max-w-[180px]">{item.createdBy?.email || ''}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Panel */}
            <div className="pt-6 border-t border-gray-100 flex flex-wrap gap-3">
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100 text-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Report
              </button>
              <button
                onClick={handleDelete}
                className="px-6 py-3 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 hover:text-red-700 active:scale-95 transition-all flex items-center gap-2 border border-red-100/50 text-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Report
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Possible Matches Section */}
      <div className="mb-10">
        {item.linkedFoundItem ? (
          <div className="bg-emerald-50/50 p-6 rounded-2xl shadow-sm border border-emerald-100/80 mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-extrabold text-emerald-950 text-base">Linked and Resolved Match</h3>
                  <p className="text-xs text-emerald-700/80 mt-1">This report is successfully linked with a found item.</p>
                </div>
              </div>
              <Link
                to={`/admin/found-items/${item.linkedFoundItem._id || item.linkedFoundItem}`}
                className="bg-white text-emerald-700 font-bold px-5 py-2.5 rounded-xl shadow-sm border border-emerald-200/50 hover:bg-emerald-50 transition-colors text-sm"
              >
                View Found Record
              </Link>
            </div>
          </div>
        ) : null}



        {matches.length === 0 ? (
          <div className="bg-gray-50/50 border-2 border-dashed border-gray-200/60 rounded-3xl p-10 text-center">
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {matches.map(match => (
              <div key={match._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:border-indigo-100 transition-all duration-300 group">
                <div className="flex h-36">
                  <div className="w-1/3 bg-gray-50 relative overflow-hidden flex items-center justify-center border-r border-gray-100">
                    {match.foundItemId.image || match.foundItemId.imageUrl ? (
                      <img src={getImageUrl(match.foundItemId)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <svg className="w-10 h-10 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-md text-[9px] font-black text-white shadow-sm tracking-wider uppercase ${match.matchScore >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                      {match.matchScore}% Match
                    </div>
                  </div>
                  <div className="w-2/3 p-4 flex flex-col justify-between">
                    <div>
                      <span className="inline-block px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[9px] uppercase font-bold tracking-wider mb-2">
                        {match.foundItemId.category}
                      </span>
                      <p className="text-xs text-gray-500 font-semibold truncate">Found at: {match.foundItemId.locationFound}</p>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        to={`/admin/found-items/${match.foundItemId._id}`}
                        className="w-full bg-gray-50 text-indigo-600 hover:bg-indigo-50 border border-indigo-100/30 text-center py-2 rounded-xl text-xs font-bold transition-colors"
                      >
                        View Found Item
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <EditLostItemModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={() => {
          const fetchData = async () => {
            try {
              setLoading(true);
              const [itemData, matchesData] = await Promise.all([
                getLostItemById(id),
                getMatchesForLostItem(id)
              ]);
              setItem(itemData);
              setMatches(matchesData);
            } catch (err) {
              setError('Could not locate that item report.');
            } finally {
              setLoading(false);
            }
          };
          fetchData();
        }}
        item={item}
      />
    </AdminLayout>
  );
};

export default LostItemDetails;
