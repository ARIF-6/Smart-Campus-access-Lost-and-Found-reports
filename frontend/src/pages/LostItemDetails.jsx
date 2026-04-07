import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { getLostItemById, deleteLostItem, getMatchesForLostItem } from '../services/api';

const LostItemDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
    if (window.confirm('Delete this report permanently?')) {
      try {
        await deleteLostItem(id);
        navigate('/admin/lost-items');
      } catch (err) {
        alert(err.response?.data?.message || 'Error deleting item.');
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
    <AdminLayout title={`Lost Item: ${item.title}`}>
      <div className="mb-6">
        <Link to="/admin/lost-items" className="text-red-600 hover:text-red-800 font-semibold flex items-center gap-1 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to Directory
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mb-10">
        <div className="grid grid-cols-1 md:grid-cols-3">
          
          {/* Image Display */}
          <div className="bg-gray-50 flex items-center justify-center p-8 border-b md:border-b-0 md:border-r border-gray-200">
            {item.image ? (
              <img src={`http://localhost:5000${item.image}`} alt={item.title} className="max-w-full h-auto rounded-xl shadow-md object-cover max-h-96" />
            ) : (
              <div className="text-center text-gray-300">
                <svg className="w-32 h-32 mx-auto mb-2 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <p className="font-medium">No Image Uploaded</p>
              </div>
            )}
          </div>

           {/* Content area */}
          <div className="md:col-span-2 p-8">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-4xl font-extrabold text-gray-900 mb-4">{item.title}</h2>
                <div className="flex gap-2">
                  <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest shadow-sm
                    ${item.status === 'lost' ? 'bg-red-100 text-red-800' : 
                      item.status === 'matched' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-green-100 text-green-800'}`
                  }>
                    {item.status}
                  </span>
                  <span className="px-4 py-1.5 bg-gray-100 text-gray-700 rounded-full text-xs font-bold uppercase tracking-widest shadow-sm">
                    {item.category}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Date Reported Lost</p>
                <p className="text-xl text-gray-800 font-bold">{new Date(item.dateLost).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="mb-10">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Item Description</h3>
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 text-gray-700 leading-relaxed shadow-inner">
                {item.description}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-10">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-50 rounded-lg">
                  <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Last Seen At</h3>
                  <p className="text-gray-900 font-bold">{item.locationLost}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Reported By</h3>
                  <p className="text-gray-900 font-bold">{item.reportedBy?.name || 'Unknown User'}</p>
                  <p className="text-xs text-gray-500 font-medium">{item.reportedBy?.email || ''}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-8 border-t border-gray-100 flex flex-wrap gap-4">
              <button 
                onClick={handleDelete}
                className="px-8 py-3 bg-red-100 text-red-700 rounded-xl font-bold hover:bg-red-200 transition-all flex items-center gap-2 shadow-sm"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Delete Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Possible Matches Section */}
      <div className="mb-10">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <svg className="w-7 h-7 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          Smart Suggestions: Possible Matches
        </h3>
        
        {matches.length === 0 ? (
          <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center">
            <p className="text-gray-500 font-medium italic">No matches detected at this time. Our smart system scans for new entries 24/7.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {matches.map(match => (
              <div key={match._id} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300 group">
                <div className="flex h-40">
                  <div className="w-1/3 bg-gray-100 relative overflow-hidden">
                    {match.foundItemId.image ? (
                      <img src={`http://localhost:5000${match.foundItemId.image}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                    )}
                    <div className={`absolute top-2 left-2 px-2 py-1 rounded-md text-[10px] font-bold text-white shadow-lg ${match.matchScore >= 80 ? 'bg-green-500' : 'bg-yellow-500'}`}>
                      {match.matchScore}% Match
                    </div>
                  </div>
                  <div className="w-2/3 p-4 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg mb-1 truncate">{match.foundItemId.title}</h4>
                      <p className="text-xs text-gray-500 mb-2 truncate">Found at: {match.foundItemId.locationFound}</p>
                      <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] uppercase font-bold tracking-wider">
                        {match.foundItemId.category}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Link 
                        to={`/admin/found-items/${match.foundItemId._id}`}
                        className="flex-1 bg-blue-600 text-white text-center py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors"
                      >
                        View Item
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default LostItemDetails;
