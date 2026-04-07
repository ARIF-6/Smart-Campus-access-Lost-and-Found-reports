import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { getLostItems, deleteLostItem } from '../services/api';
import ReportLostItemModal from '../components/ReportLostItemModal';

const LostItemsList = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const fetchItems = async () => {
    try {
      setLoading(true);
      const data = await getLostItems({
        search,
        category: category === 'All' ? '' : category,
        status: statusFilter === 'All' ? '' : statusFilter
      });
      setItems(data);
    } catch (err) {
      setError('Failed to load lost items.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [category, statusFilter]);

  const handleSearchCommit = (e) => {
    if (e.key === 'Enter') {
      fetchItems();
    }
  };

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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'lost':
        return <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold uppercase tracking-wide">Lost</span>;
      case 'matched':
        return <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold uppercase tracking-wide">Matched</span>;
      case 'returned':
        return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold uppercase tracking-wide">Returned</span>;
      default:
        return <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-bold uppercase tracking-wide">{status}</span>;
    }
  };

  return (
    <AdminLayout title="Lost Items Directory">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Lost Items</h2>
          <p className="text-sm text-gray-500">Manage reported missing items on campus.</p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg shadow-sm font-medium transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Report Lost Item
        </button>
      </div>

      {/* Filter Ribbon */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search by title..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchCommit}
          />
        </div>
        
        <div className="flex w-full md:w-auto gap-4">
          <select 
            value={category} 
            onChange={(e) => setCategory(e.target.value)}
            className="block w-full md:w-auto px-3 py-2 border border-gray-300 bg-white rounded-lg text-sm"
          >
            <option value="All">All Categories</option>
            <option value="electronics">Electronics</option>
            <option value="accessories">Clothing & Accessories</option>
            <option value="documents">IDs & Documents</option>
            <option value="stationary">Books & Stationary</option>
            <option value="other">Other</option>
          </select>

          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="block w-full md:w-auto px-3 py-2 border border-gray-300 bg-white rounded-lg text-sm"
          >
            <option value="All">All Statuses</option>
            <option value="lost">Lost</option>
            <option value="matched">Matched</option>
            <option value="returned">Returned</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-6 rounded-xl text-center border border-red-200">{error}</div>
      ) : (
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 uppercase text-xs font-bold text-gray-500 tracking-wider">
                <tr>
                  <th className="px-6 py-4 text-left">Image</th>
                  <th className="px-6 py-4 text-left">Title</th>
                  <th className="px-6 py-4 text-left">Category</th>
                  <th className="px-6 py-4 text-left">Location Lost</th>
                  <th className="px-6 py-4 text-left">Reported By</th>
                  <th className="px-6 py-4 text-left">Date</th>
                  <th className="px-6 py-4 text-left">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.length === 0 ? (
                  <tr><td colSpan="8" className="px-6 py-12 text-center text-gray-500 italic">No lost items found.</td></tr>
                ) : (
                  items.map(item => (
                    <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="h-10 w-10 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center border border-gray-200">
                          {item.image ? (
                            <img src={`http://localhost:5000${item.image}`} alt={item.title} className="h-full w-full object-cover" />
                          ) : (
                            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-900">{item.title}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 capitalize">{item.category}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{item.locationLost}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{item.reportedBy?.name || 'Unknown'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{new Date(item.dateLost).toLocaleDateString()}</td>
                      <td className="px-6 py-4">{getStatusBadge(item.status)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <Link to={`/admin/lost-items/${item._id}`} className="px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded transition-colors">View</Link>
                          <button onClick={() => handleDelete(item._id)} className="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded transition-colors">Delete</button>
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
    </AdminLayout>
  );
};

export default LostItemsList;
