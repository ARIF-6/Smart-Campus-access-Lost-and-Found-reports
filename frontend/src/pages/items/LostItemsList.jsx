import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { getLostItems, deleteLostItem } from '../../services/api';
import { fetchLostFoundCategories } from '../../services/categoryService';
import ReportLostItemModal from '../../components/modals/ReportLostItemModal';
import EditLostItemModal from '../../components/modals/EditLostItemModal';
import SearchBar from '../../components/common/SearchBar';
import Pagination from '../../components/common/Pagination';
import Filter from '../../components/common/Filter';
import { getImageUrl } from '../../utils/imageUtils';

const LostItemsList = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [dynamicCategories, setDynamicCategories] = useState([]);

  // Pagination & Filtering State
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (keyword) params.keyword = keyword;
      if (category) params.category = category;
      if (status) params.status = status;

      const data = await getLostItems(params);
      // Handle both direct array and paginated object { items: [], total: X }
      const itemsList = data?.items || (Array.isArray(data) ? data : []);
      setItems(itemsList);
    } catch (err) {
      setError('Failed to load lost items.');
    } finally {
      setLoading(false);
    }
  }, [keyword, category, status]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Fetch dynamic categories from the system
  useEffect(() => {
    fetchLostFoundCategories().then(cats => setDynamicCategories(cats));
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to permanently delete this report?')) {
      try {
        await deleteLostItem(id);
        fetchItems();
      } catch (err) {
        alert(err.response?.data?.message || 'Error deleting item.');
      }
    }
  };

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'claimed', label: 'Claimed' }
  ];

  const categoryOptions = [
    ...dynamicCategories.map(cat => ({ value: cat.name, label: cat.name }))
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-[10px] font-black uppercase tracking-widest border border-yellow-200">Pending</span>;
      case 'approved':
        return <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-200">Approved</span>;
      case 'rejected':
        return <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-[10px] font-black uppercase tracking-widest border border-red-200">Rejected</span>;
      case 'claimed':
        return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-200">Claimed</span>;
      default:
        return <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-[10px] font-black uppercase tracking-widest border border-gray-200">{status}</span>;
    }
  };

  const filteredItems = items.filter(item => {
    if (!filterDate) return true;
    const itemDateStr = item.dateLost || item.createdAt;
    if (!itemDateStr) return true;
    try {
      const itemDate = new Date(itemDateStr).toISOString().split('T')[0];
      return itemDate === filterDate;
    } catch (e) {
      return true;
    }
  });

  return (
    <AdminLayout title="Lost Items Directory">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-gray-800 tracking-tight">Lost Items</h2>
          <p className="text-sm text-gray-400 font-medium">Manage and track reported missing items on campus.</p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl shadow-xl shadow-indigo-100 font-black text-xs uppercase tracking-widest transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Report Lost Item
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8 flex flex-col lg:flex-row gap-6 items-end">
        <div className="flex-1 w-full">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">Search Items</label>
          <SearchBar onSearch={setKeyword} placeholder="Search by title, description..." />
        </div>
        
        <div className="flex flex-wrap gap-4 w-full lg:w-auto">
          <div className="flex flex-col">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">Date</label>
            <input
              type="date"
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>
          <Filter 
            label="Category" 
            value={category} 
            options={categoryOptions} 
            onChange={(val) => { setCategory(val); }} 
          />
          <Filter 
            label="Status" 
            value={status} 
            options={statusOptions} 
            onChange={(val) => { setStatus(val); }} 
          />
          <button 
            onClick={() => { setKeyword(''); setCategory(''); setStatus(''); setFilterDate(''); }}
            className="px-4 py-3 text-indigo-600 font-bold text-xs uppercase tracking-widest hover:bg-indigo-50 rounded-xl transition-all"
          >
            Reset
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 min-h-[40vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-100 border-t-indigo-600 mb-4"></div>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Updating Directory...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-8 rounded-2xl text-center border border-red-100 font-bold uppercase tracking-tight shadow-sm">{error}</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 mb-8">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50 border-b border-gray-100 uppercase text-[10px] font-black text-gray-400 tracking-widest">
                <tr>
                  <th className="px-6 py-5">Image</th>
                  <th className="px-6 py-5">Location</th>
                  <th className="px-6 py-5">Reported By</th>
                  <th className="px-6 py-5">Date</th>
                  <th className="px-6 py-5">Status</th>
                  <th className="px-6 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredItems.length === 0 ? (
                  <tr><td colSpan="6" className="px-6 py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs italic">No items found</td></tr>
                ) : (
                  filteredItems.map(item => (
                    <tr key={item._id} className="hover:bg-gray-50/80 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="h-12 w-12 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center border border-gray-100 shadow-inner group-hover:scale-110 transition-transform">
                          {item.image || item.imageUrl ? (
                            <img src={getImageUrl(item)} alt={item.title || item.category} className="h-full w-full object-cover" />
                          ) : (
                            <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">{item.location}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-700">{item.createdBy?.fullName || item.createdBy?.name || item.createdBy?.email || ''}</span>
                          <span className="text-[10px] text-gray-400">{item.createdBy?.email || ''}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400 font-mono">
                        {item.dateLost ? new Date(item.dateLost).toLocaleDateString() : new Date(item.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(item.status)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex justify-end gap-2">
                           <Link to={`/admin/lost-items/${item._id}`} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="View Details">
                             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                           </Link>
                           <button onClick={() => setEditingItem(item)} className="p-2 text-blue-400 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all" title="Edit Report Info">
                             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                           </button>
                          <button onClick={() => handleDelete(item._id)} className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all" title="Delete Report">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}



      {/* Modal Integration */}
      <ReportLostItemModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchItems} 
      />

      <EditLostItemModal 
        isOpen={!!editingItem} 
        onClose={() => setEditingItem(null)} 
        onSuccess={fetchItems}
        item={editingItem}
      />
    </AdminLayout>
  );
};

export default LostItemsList;
