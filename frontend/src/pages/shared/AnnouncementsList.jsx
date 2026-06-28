import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/layout/AdminLayout'; // Reusing for consistency
import { getAnnouncements } from '../../services/api';
import { toast } from 'react-hot-toast';
import SearchBar from '../../components/common/SearchBar';
import Pagination from '../../components/common/Pagination';
import { useSocket } from '../../context/SocketContext';

const AnnouncementsList = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const socket = useSocket();
  
  // Pagination & Filtering State
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAnnouncements({
        page,
        limit: 5,
        keyword
      });
      setAnnouncements(data.results || []);
      setPages(data.pages || 1);
      setTotal(data.total || 0);
    } catch (error) {
      toast.error('Failed to fetch announcements');
    } finally {
      setLoading(false);
    }
  }, [page, keyword]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  useEffect(() => {
    if (socket) {
      const handleNewAnnouncement = (newAnn) => {
        // If we are on the first page and no search, we can prepend
        if (page === 1 && !keyword) {
          setAnnouncements(prev => [newAnn, ...prev.slice(0, 4)]);
        }
        toast('📢 New Announcement!', {
          icon: '🔔',
          style: {
            borderRadius: '16px',
            background: '#1e1b4b',
            color: '#fff',
          },
        });
      };

      socket.on('new_announcement', handleNewAnnouncement);
      return () => socket.off('new_announcement', handleNewAnnouncement);
    }
  }, [socket, page, keyword]);

  return (
    <AdminLayout title="News & Updates">
      <div className="space-y-8 pb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-black text-gray-800 tracking-tight">Announcements</h2>
            <p className="text-sm text-gray-400 font-medium">Stay updated with the latest campus notifications.</p>
          </div>
          <div className="w-full md:w-80">
            <SearchBar onSearch={setKeyword} placeholder="Search updates..." />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 min-h-[50vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-100 border-t-indigo-600 mb-4"></div>
            <p className="font-bold text-gray-400 uppercase tracking-widest text-[10px]">Fetching Updates...</p>
          </div>
        ) : announcements.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 min-h-[50vh] bg-white rounded-3xl border border-dashed border-gray-200 shadow-inner">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
            </div>
            <p className="text-gray-400 font-black uppercase tracking-widest text-xs italic">No relevant announcements found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            {announcements.map((ann, index) => (
              <div 
                key={ann._id} 
                className={`bg-white rounded-3xl shadow-sm border border-gray-100 p-10 hover:shadow-2xl hover:shadow-indigo-50/50 transition-all duration-500 hover:-translate-y-2 group ${index === 0 && page === 1 && !keyword ? 'ring-2 ring-indigo-500 ring-offset-8' : ''}`}
              >
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                    </div>
                    <div>
                      {index === 0 && page === 1 && !keyword && <span className="bg-orange-500 text-white text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shadow-lg shadow-orange-100 italic mb-2 inline-block animate-bounce">Latest News</span>}
                      <h3 className="text-2xl font-black text-gray-800 tracking-tight leading-none group-hover:text-indigo-600 transition-colors uppercase">{ann.title}</h3>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 font-mono">
                    {new Date(ann.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <div className="bg-gray-50/30 p-8 rounded-2xl border border-gray-50 group-hover:bg-white transition-colors">
                  <p className="text-gray-600 text-base leading-relaxed whitespace-pre-wrap font-medium">{ann.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <Pagination page={page} pages={pages} onPageChange={setPage} />
      </div>
    </AdminLayout>
  );
};

export default AnnouncementsList;
