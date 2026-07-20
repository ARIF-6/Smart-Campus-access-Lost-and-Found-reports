import React, { useEffect, useState, useCallback } from 'react';
import { fetchCategories, createCategory, updateCategory, deleteCategory } from '../services/categoryService';
import { fetchHosts, createHost, updateHost, deleteHost } from '../services/hostService';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import AdminLayout from '../components/layout/AdminLayout';
import { customConfirm } from '../utils/confirm';

// ─── Reusable category panel ────────────────────────────────────────────────
const CategoryPanel = ({ categoryType, accentColor }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [name, setName] = useState('');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [editName, setEditName] = useState('');
  const [status, setStatus] = useState('active');

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchCategories(categoryType, true);
      let dataArray = [];
      if (res) {
        if (Array.isArray(res.data)) dataArray = res.data;
        else if (res.data && Array.isArray(res.data.data)) dataArray = res.data.data;
        else if (Array.isArray(res)) dataArray = res;
      }
      setCategories(dataArray);
    } catch (err) {
      toast.error('Failed to load categories');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [categoryType]);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Category name is required'); return; }
    try {
      await createCategory({ name: name.trim(), categoryType, status: 'active' });
      toast.success('Category created successfully.');
      setName('');
      loadCategories();
    } catch (err) {
      const msg = err.response?.data?.message || '';
      if (msg.toLowerCase().includes('already exists') || err.response?.status === 409) {
        toast.error('This category already exists.');
      } else {
        toast.error('Unable to create category. Please try again.');
      }
    }
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!editName.trim()) { toast.error('Category name is required'); return; }
    try {
      await updateCategory(selectedCategory._id, { name: editName.trim(), status });
      toast.success('Category updated successfully.');
      setIsEditOpen(false);
      setSelectedCategory(null);
      setEditName('');
      loadCategories();
    } catch (err) {
      const msg = err.response?.data?.message || '';
      if (msg.toLowerCase().includes('already exists') || err.response?.status === 409) {
        toast.error('This category already exists.');
      } else {
        toast.error(err.response?.data?.message || 'Failed to update category');
      }
    }
  };

  const handleDeleteClick = async (id) => {
    const confirmed = await customConfirm('Are you sure you want to delete this category?');
    if (confirmed) {
      try {
        await deleteCategory(id);
        toast.success('Category deleted successfully');
        loadCategories();
      } catch {
        toast.error('Failed to delete category');
      }
    }
  };

  const openEditModal = (cat) => {
    setSelectedCategory(cat);
    setEditName(cat.name);
    setStatus(cat.status);
    setIsEditOpen(true);
  };

  const filtered = categories.filter((cat) =>
    cat.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      {/* Toolbar */}
      <div style={{
        background: '#fff', borderRadius: 12, border: '1px solid #e8eaed',
        padding: '22px 32px', marginBottom: 20,
        display: 'flex', alignItems: 'flex-end', gap: 24, flexWrap: 'wrap',
      }}>
        <div style={{ flex: '1 1 220px', minWidth: 180, maxWidth: 340 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9aa0b0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Search Category
          </label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', top: '50%', left: 12, transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <svg width="16" height="16" fill="none" stroke="#b0b7c3" strokeWidth="2.2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="7" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
              </svg>
            </span>
            <input
              type="text" placeholder="Search category..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', paddingLeft: 36, paddingRight: 14, paddingTop: 9, paddingBottom: 9, fontSize: 13, fontWeight: 500, color: '#2d3142', border: '1px solid #e1e4ea', borderRadius: 8, background: '#f8f9fb', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        <form onSubmit={handleCreateSubmit} style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flex: '2 1 400px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 220px' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9aa0b0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              New Category Name
            </label>
            <input
              type="text" placeholder="Enter category name" value={name}
              onChange={(e) => setName(e.target.value)} required
              style={{ width: '100%', padding: '9px 14px', fontSize: 13, fontWeight: 500, color: '#2d3142', border: '1px solid #e1e4ea', borderRadius: 8, background: '#f8f9fb', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <button type="submit" style={{ background: accentColor, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 22px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap', height: 38 }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Category
          </button>
        </form>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8eaed', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', maxHeight: 520, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
            <thead>
              <tr style={{ background: '#f8f9fb', borderBottom: '1px solid #e8eaed' }}>
                <th style={thStyle({ width: 60 })}>#</th>
                <th style={thStyle()}>Category Name</th>
                <th style={thStyle()}>Created By</th>
                <th style={thStyle()}>Created Date</th>
                <th style={thStyle()}>Status</th>
                <th style={{ ...thStyle(), textAlign: 'right', paddingRight: 28 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: '48px 0', textAlign: 'center', color: '#9aa0b0', fontSize: 14, fontWeight: 600 }}>Loading categories...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '48px 0', textAlign: 'center', color: '#9aa0b0', fontSize: 14, fontWeight: 600 }}>No categories found.</td></tr>
              ) : (
                filtered.map((item, index) => (
                  <tr
                    key={item._id}
                    style={{ borderBottom: '1px solid #f0f1f5', transition: 'background 0.12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafbfc'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <td style={tdStyle({ fontWeight: 700, color: '#9aa0b0', width: 60 })}>{index + 1}</td>
                    <td style={tdStyle({ fontWeight: 700, color: '#1a1a2e' })}>{item.name}</td>
                    <td style={tdStyle()}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e' }}>{item.createdBy?.fullName || 'System'}</div>
                      <div style={{ fontSize: 11, color: '#9aa0b0', fontWeight: 500, marginTop: 1 }}>{item.createdBy?.role || 'staff'}</div>
                    </td>
                    <td style={tdStyle({ color: '#4a5068', fontWeight: 600 })}>{new Date(item.createdAt).toLocaleDateString('en-CA')}</td>
                    <td style={tdStyle()}>
                      <span style={{
                        display: 'inline-block', padding: '3px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                        ...(item.status === 'active'
                          ? { background: '#e8f8ef', color: '#1a9f55', border: '1px solid #b6ecce' }
                          : { background: '#fef0f0', color: '#d63b3b', border: '1px solid #fad0d0' }),
                      }}>
                        {item.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ ...tdStyle(), textAlign: 'right', paddingRight: 24 }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button onClick={() => openEditModal(item)} title="Edit Category"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px 6px', borderRadius: 6, color: accentColor, display: 'flex', alignItems: 'center', transition: 'background 0.1s' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#eeebff'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => handleDeleteClick(item._id)} title="Delete Category"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px 6px', borderRadius: 6, color: '#e53e3e', display: 'flex', alignItems: 'center', transition: 'background 0.1s' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#fff0f0'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
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

      {/* Edit Modal */}
      {isEditOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 440, padding: '32px 32px 28px', boxShadow: '0 20px 60px rgba(0,0,0,0.18)', border: '1px solid #e8eaed' }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1a1a2e', marginTop: 0, marginBottom: 22 }}>Edit Category</h3>
            <form onSubmit={handleUpdateSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#3d4464', marginBottom: 7 }}>Category Name</label>
                <input type="text" required value={editName} onChange={(e) => setEditName(e.target.value)}
                  placeholder="Enter category name"
                  style={{ width: '100%', padding: '10px 14px', fontSize: 13, fontWeight: 500, color: '#2d3142', border: '1px solid #d1d5db', borderRadius: 8, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#3d4464', marginBottom: 7 }}>Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', fontSize: 13, fontWeight: 500, color: '#2d3142', border: '1px solid #d1d5db', borderRadius: 8, outline: 'none', background: '#fff' }}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => { setIsEditOpen(false); setSelectedCategory(null); }}
                  style={{ padding: '9px 20px', border: '1px solid #d1d5db', borderRadius: 8, background: '#fff', color: '#4a5068', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit"
                  style={{ padding: '9px 20px', border: 'none', borderRadius: 8, background: accentColor, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Reusable host panel ────────────────────────────────────────────────────
const HostPanel = ({ accentColor }) => {
  const [hosts, setHosts] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Create form state
  const [name, setName] = useState('');
  const [faculty, setFaculty] = useState('');
  const [campus, setCampus] = useState('');

  // Edit form state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedHost, setSelectedHost] = useState(null);
  const [editName, setEditName] = useState('');
  const [editFaculty, setEditFaculty] = useState('');
  const [editCampus, setEditCampus] = useState('');
  const [editStatus, setEditStatus] = useState('active');

  const loadCampuses = useCallback(async () => {
    try {
      const res = await api.get('/university/campuses');
      if (res.data && res.data.data) {
        setCampuses(res.data.data);
      } else if (Array.isArray(res.data)) {
        setCampuses(res.data);
      }
    } catch (err) {
      console.error('Failed to load campuses', err);
    }
  }, []);

  const loadFaculties = useCallback(async () => {
    try {
      const res = await api.get('/university/faculties');
      if (res.data && res.data.data) {
        setFaculties(res.data.data);
      } else if (Array.isArray(res.data)) {
        setFaculties(res.data);
      }
    } catch (err) {
      console.error('Failed to load faculties', err);
    }
  }, []);

  const loadHosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchHosts();
      let dataArray = [];
      if (res) {
        if (Array.isArray(res.data)) dataArray = res.data;
        else if (res.data && Array.isArray(res.data.data)) dataArray = res.data.data;
        else if (Array.isArray(res)) dataArray = res;
      }
      setHosts(dataArray);
    } catch (err) {
      toast.error('Failed to load hosts');
      setHosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    loadCampuses();
    loadFaculties();
    loadHosts(); 
  }, [loadCampuses, loadFaculties, loadHosts]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Host name is required'); return; }
    if (!campus) { toast.error('Campus is required'); return; }
    try {
      await createHost({ name: name.trim(), faculty: faculty.trim(), campus, status: 'active' });
      toast.success('Host created successfully.');
      setName('');
      setFaculty('');
      setCampus('');
      loadHosts();
    } catch (err) {
      const msg = err.response?.data?.message || '';
      if (msg.toLowerCase().includes('already exists') || err.response?.status === 409) {
        toast.error('This host already exists in the selected campus.');
      } else {
        toast.error('Unable to create host. Please try again.');
      }
    }
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!editName.trim()) { toast.error('Host name is required'); return; }
    if (!editCampus) { toast.error('Campus is required'); return; }
    try {
      await updateHost(selectedHost._id, { name: editName.trim(), faculty: editFaculty.trim(), campus: editCampus, status: editStatus });
      toast.success('Host updated successfully.');
      setIsEditOpen(false);
      setSelectedHost(null);
      setEditName('');
      setEditFaculty('');
      setEditCampus('');
      loadHosts();
    } catch (err) {
      const msg = err.response?.data?.message || '';
      if (msg.toLowerCase().includes('already exists') || err.response?.status === 409) {
        toast.error('This host already exists in the selected campus.');
      } else {
        toast.error(err.response?.data?.message || 'Failed to update host');
      }
    }
  };

  const handleDeleteClick = async (id) => {
    const confirmed = await customConfirm('Are you sure you want to delete this host?');
    if (confirmed) {
      try {
        await deleteHost(id);
        toast.success('Host deleted successfully');
        loadHosts();
      } catch {
        toast.error('Failed to delete host');
      }
    }
  };

  const openEditModal = (hst) => {
    setSelectedHost(hst);
    setEditName(hst.name);
    setEditFaculty(hst.faculty || '');
    setEditCampus(hst.campus || (campuses.find(c => c.name === hst.campus)?._id) || '');
    setEditStatus(hst.status);
    setIsEditOpen(true);
  };

  const filtered = hosts.filter((hst) =>
    hst.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    hst.campus?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    hst.faculty?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      {/* Toolbar */}
      <div style={{
        background: '#fff', borderRadius: 12, border: '1px solid #e8eaed',
        padding: '22px 32px', marginBottom: 20,
        display: 'flex', alignItems: 'flex-end', gap: 24, flexWrap: 'wrap',
      }}>
        <div style={{ flex: '1 1 220px', minWidth: 180, maxWidth: 340 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9aa0b0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Search Host
          </label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', top: '50%', left: 12, transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <svg width="16" height="16" fill="none" stroke="#b0b7c3" strokeWidth="2.2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="7" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
              </svg>
            </span>
            <input
              type="text" placeholder="Search host..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', paddingLeft: 36, paddingRight: 14, paddingTop: 9, paddingBottom: 9, fontSize: 13, fontWeight: 500, color: '#2d3142', border: '1px solid #e1e4ea', borderRadius: 8, background: '#f8f9fb', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        <form onSubmit={handleCreateSubmit} style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flex: '2 1 500px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 180px' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9aa0b0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              New Host Name
            </label>
            <input
              type="text" placeholder="Host name" value={name}
              onChange={(e) => setName(e.target.value)} required
              style={{ width: '100%', padding: '9px 14px', fontSize: 13, fontWeight: 500, color: '#2d3142', border: '1px solid #e1e4ea', borderRadius: 8, background: '#f8f9fb', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ flex: '1 1 140px' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9aa0b0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              Faculty
            </label>
            <select
              value={faculty} onChange={(e) => setFaculty(e.target.value)}
              style={{ width: '100%', padding: '9px 14px', fontSize: 13, fontWeight: 500, color: '#2d3142', border: '1px solid #e1e4ea', borderRadius: 8, background: '#f8f9fb', outline: 'none', boxSizing: 'border-box' }}
            >
              <option value="">Select Faculty (Optional)</option>
              {faculties.map(f => (
                <option key={f._id} value={f.name}>{f.name}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: '1 1 140px' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9aa0b0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              Campus
            </label>
            <select
              value={campus} onChange={(e) => setCampus(e.target.value)} required
              style={{ width: '100%', padding: '9px 14px', fontSize: 13, fontWeight: 500, color: '#2d3142', border: '1px solid #e1e4ea', borderRadius: 8, background: '#f8f9fb', outline: 'none', boxSizing: 'border-box' }}
            >
              <option value="">Select Campus</option>
              {campuses.map(c => (
                <option key={c._id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
          <button type="submit" style={{ background: accentColor, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 22px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap', height: 38 }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Host
          </button>
        </form>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8eaed', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', maxHeight: 520, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
            <thead>
              <tr style={{ background: '#f8f9fb', borderBottom: '1px solid #e8eaed' }}>
                <th style={thStyle({ width: 60 })}>#</th>
                <th style={thStyle()}>Host Name</th>
                <th style={thStyle()}>Campus &amp; Faculty</th>
                <th style={thStyle()}>Created Date</th>
                <th style={thStyle()}>Status</th>
                <th style={{ ...thStyle(), textAlign: 'right', paddingRight: 28 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: '48px 0', textAlign: 'center', color: '#9aa0b0', fontSize: 14, fontWeight: 600 }}>Loading hosts...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '48px 0', textAlign: 'center', color: '#9aa0b0', fontSize: 14, fontWeight: 600 }}>No hosts found.</td></tr>
              ) : (
                filtered.map((item, index) => (
                  <tr
                    key={item._id}
                    style={{ borderBottom: '1px solid #f0f1f5', transition: 'background 0.12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafbfc'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <td style={tdStyle({ fontWeight: 700, color: '#9aa0b0', width: 60 })}>{index + 1}</td>
                    <td style={tdStyle({ fontWeight: 700, color: '#1a1a2e' })}>{item.name}</td>
                    <td style={tdStyle()}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e' }}>{item.campus}</div>
                      <div style={{ fontSize: 11, color: '#9aa0b0', fontWeight: 500, marginTop: 1 }}>{item.faculty || 'N/A'}</div>
                    </td>
                    <td style={tdStyle({ color: '#4a5068', fontWeight: 600 })}>{new Date(item.createdAt).toLocaleDateString('en-CA')}</td>
                    <td style={tdStyle()}>
                      <span style={{
                        display: 'inline-block', padding: '3px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700,
                        ...(item.status === 'active'
                          ? { background: '#e8f8ef', color: '#1a9f55', border: '1px solid #b6ecce' }
                          : { background: '#fef0f0', color: '#d63b3b', border: '1px solid #fad0d0' }),
                      }}>
                        {item.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ ...tdStyle(), textAlign: 'right', paddingRight: 24 }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button onClick={() => openEditModal(item)} title="Edit Host"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px 6px', borderRadius: 6, color: accentColor, display: 'flex', alignItems: 'center', transition: 'background 0.1s' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#eeebff'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => handleDeleteClick(item._id)} title="Delete Host"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px 6px', borderRadius: 6, color: '#e53e3e', display: 'flex', alignItems: 'center', transition: 'background 0.1s' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#fff0f0'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
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

      {/* Edit Modal */}
      {isEditOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 440, padding: '32px 32px 28px', boxShadow: '0 20px 60px rgba(0,0,0,0.18)', border: '1px solid #e8eaed' }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1a1a2e', marginTop: 0, marginBottom: 22 }}>Edit Host</h3>
            <form onSubmit={handleUpdateSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#3d4464', marginBottom: 7 }}>Host Name</label>
                <input type="text" required value={editName} onChange={(e) => setEditName(e.target.value)}
                  placeholder="Enter host name"
                  style={{ width: '100%', padding: '10px 14px', fontSize: 13, fontWeight: 500, color: '#2d3142', border: '1px solid #d1d5db', borderRadius: 8, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#3d4464', marginBottom: 7 }}>Faculty</label>
                <select value={editFaculty} onChange={(e) => setEditFaculty(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', fontSize: 13, fontWeight: 500, color: '#2d3142', border: '1px solid #d1d5db', borderRadius: 8, outline: 'none', background: '#fff' }}>
                  <option value="">Select Faculty (Optional)</option>
                  {faculties.map(f => (
                    <option key={f._id} value={f.name}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#3d4464', marginBottom: 7 }}>Campus</label>
                <select value={editCampus} onChange={(e) => setEditCampus(e.target.value)} required
                  style={{ width: '100%', padding: '10px 14px', fontSize: 13, fontWeight: 500, color: '#2d3142', border: '1px solid #d1d5db', borderRadius: 8, outline: 'none', background: '#fff' }}>
                  <option value="">Select Campus</option>
                  {campuses.map(c => (
                    <option key={c._id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#3d4464', marginBottom: 7 }}>Status</label>
                <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', fontSize: 13, fontWeight: 500, color: '#2d3142', border: '1px solid #d1d5db', borderRadius: 8, outline: 'none', background: '#fff' }}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => { setIsEditOpen(false); setSelectedHost(null); }}
                  style={{ padding: '9px 20px', border: '1px solid #d1d5db', borderRadius: 8, background: '#fff', color: '#4a5068', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit"
                  style={{ padding: '9px 20px', border: 'none', borderRadius: 8, background: accentColor, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main page ──────────────────────────────────────────────────────────────────
const CategoryManagement = () => {
  const [activeTab, setActiveTab] = useState('lost_found');

  const tabs = [
    {
      id: 'lost_found',
      label: 'Lost & Found Registration',
      accentColor: '#4c3bcf',
      icon: (
        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
    },
    {
      id: 'incident',
      label: 'Incident Registration',
      accentColor: '#d97706',
      icon: (
        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    {
      id: 'host_management',
      label: 'Host Management',
      accentColor: '#10b981',
      icon: (
        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
  ];

  const current = tabs.find(t => t.id === activeTab);

  return (
    <AdminLayout title="Category Management">
      <div style={{ background: '#f5f6fa', minHeight: '100vh', padding: '32px 32px 48px 32px' }}>

        {/* Header */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8eaed', padding: '28px 32px 24px 32px', marginBottom: 24 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a2e', margin: 0, letterSpacing: '-0.3px' }}>
            Category Management
          </h2>
          <p style={{ fontSize: 13, color: '#7b8194', marginTop: 6, marginBottom: 0, fontWeight: 400 }}>
            Configure dynamic system categories for Lost &amp; Found and Incident reporting
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, background: '#fff', borderRadius: 12, border: '1px solid #e8eaed', padding: 6, marginBottom: 20, width: 'fit-content' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 22px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 700, transition: 'all 0.15s',
                background: activeTab === tab.id ? tab.accentColor : 'transparent',
                color: activeTab === tab.id ? '#fff' : '#7b8194',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Active Panel */}
        {activeTab === 'host_management' ? (
          <HostPanel accentColor={current.accentColor} />
        ) : (
          <CategoryPanel
            key={activeTab}
            categoryType={activeTab}
            accentColor={current.accentColor}
          />
        )}
      </div>
    </AdminLayout>
  );
};

// Helper style functions
const thStyle = (extra = {}) => ({
  padding: '13px 18px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9aa0b0',
  textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap', ...extra,
});

const tdStyle = (extra = {}) => ({
  padding: '14px 18px', fontSize: 13, color: '#4a5068', whiteSpace: 'nowrap', ...extra,
});

export default CategoryManagement;

