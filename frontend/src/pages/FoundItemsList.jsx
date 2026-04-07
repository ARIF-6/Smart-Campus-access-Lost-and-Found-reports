import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { getFoundItems, deleteFoundItem, markItemReturned } from '../services/api';
import ReportFoundItemModal from '../components/ReportFoundItemModal';

const FoundItemsList = () => {
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
      const data = await getFoundItems({
        search,
        category: category === 'All' ? '' : category,
        status: statusFilter === 'All' ? '' : statusFilter
      });
      setItems(data);
    } catch (err) {
      setError('Failed to load found items.');
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

  const handleMarkReturned = async (id) => {
    try {
      await markItemReturned(id);
      fetchItems();
    } catch (err) {
      alert('Error updating status.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to permanently delete this record?')) {
      try {
        await deleteFoundItem(id);
        fetchItems();
      } catch (err) {
        alert('Error deleting item.');
      }
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'found':
        return <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold uppercase tracking-wide">Found</span>;
      case 'claimed':
        return <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold uppercase tracking-wide">Claimed</span>;
      case 'returned':
        return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold uppercase tracking-wide">Returned</span>;
      default:
        return null;
    }
  };

  return (
    <AdminLayout title="Found Items Directory">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Found Items</h2>
          <p className="text-sm text-gray-500">Manage recovered properties stored on campus.</p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg shadow-sm font-medium transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Report Found Item
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
            placeholder="Search titles & descriptions..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
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
            <option value="found">Found</option>
            <option value="claimed">Claimed</option>
            <option value="returned">Returned</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-6 rounded-xl text-center border border-red-200">{error}</div>
      ) : (
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Item Details</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.length === 0 ? (
                  <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500">No items matched your search criteria.</td></tr>
                ) : (
                  items.map(item => (
                    <tr key={item._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                            {item.image ? (
                              <img src={`http://localhost:5000${item.image}`} alt={item.title} className="h-10 w-10 object-cover" />
                            ) : (
                              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-bold text-gray-900">{item.title}</div>
                            <div className="text-xs text-gray-500">Reported by: {item.reportedBy?.name || 'Unknown'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 capitalize">{item.category}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{item.locationFound}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(item.status)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(item.dateFound).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2 flex-wrap max-w-xs ml-auto">
                          <Link to={`/admin/found-items/${item._id}`} className="px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded font-bold transition-colors">View</Link>
                          <Link to={`/admin/found-items/${item._id}`} className="px-3 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded font-bold transition-colors">Edit</Link>
                          {!item.possibleMatch && (
                             <Link to={`/admin/found-items/${item._id}`} className="px-3 py-1 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded font-bold transition-colors">Link</Link>
                          )}
                          {(item.status === 'found' || item.status === 'claimed') && (
                            <button onClick={() => handleMarkReturned(item._id)} className="px-3 py-1 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded font-bold transition-colors">Return</button>
                          )}
                          <button onClick={() => handleDelete(item._id)} className="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded font-bold transition-colors">Delete</button>
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
      <ReportFoundItemModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchItems} 
      />
    </AdminLayout>
  );
};

export default FoundItemsList;
