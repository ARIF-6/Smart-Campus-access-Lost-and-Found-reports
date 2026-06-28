import React, { useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import toast from 'react-hot-toast';

const ReportsPage = () => {
    // Lost Items Filters
    const [lostFilters, setLostFilters] = useState({
        startDate: '',
        endDate: '',
        category: 'All',
        status: 'All'
    });

    // Claims Filters
    const [claimsFilters, setClaimsFilters] = useState({
        startDate: '',
        endDate: '',
        status: 'All'
    });

    // Users Filters
    const [userFilters, setUserFilters] = useState({
        role: 'All'
    });

    const [loading, setLoading] = useState(false);

    const categories = [
        { label: 'All Categories', value: 'All' },
        { label: 'Electronics', value: 'Electronics' },
        { label: 'Documents', value: 'Documents' },
        { label: 'Personal Items', value: 'Personal Items' },
        { label: 'Others', value: 'Others' }
    ];

    const lostStatuses = [
        { label: 'All Statuses', value: 'All' },
        { label: 'Lost', value: 'lost' },
        { label: 'Matched', value: 'matched' },
        { label: 'Returned', value: 'returned' }
    ];

    const claimStatuses = [
        { label: 'All Statuses', value: 'All' },
        { label: 'Pending', value: 'pending' },
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' }
    ];

    const userRoles = [
        { label: 'All Roles', value: 'All' },
        { label: 'Admin', value: 'admin' },
        { label: 'Student', value: 'student' },
        { label: 'Security', value: 'security' },
        { label: 'Cleaner', value: 'clean' }
    ];

    const handleExport = async (type, format, filters) => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const queryParams = new URLSearchParams({ ...filters, format }).toString();
            const baseUrl = 'http://localhost:5000/api/reports';

            const response = await fetch(`${baseUrl}/${type}?${queryParams}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Export failed');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${type}-report-${new Date().toISOString().split('T')[0]}.${format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success(`${type.split('-').join(' ').toUpperCase()} report downloaded!`);
        } catch (err) {
            console.error('Export error:', err);
            toast.error(err.message || 'Failed to generate report');
        } finally {
            setLoading(false);
        }
    };

    const ReportCard = ({ title, description, children, onExportCSV, onExportPDF }) => (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-6 border-b border-gray-50 bg-gray-50/30">
                <h3 className="text-lg font-bold text-gray-800">{title}</h3>
                <p className="text-sm text-gray-500 mt-1">{description}</p>
            </div>
            <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {children}
                </div>
                <div className="flex gap-3 pt-2">
                    <button
                        onClick={onExportCSV}
                        disabled={loading}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-indigo-600 text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 transition-colors disabled:opacity-50"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Export CSV
                    </button>
                    <button
                        onClick={onExportPDF}
                        disabled={loading}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all disabled:opacity-50"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Export PDF
                    </button>
                </div>
            </div>
        </div>
    );

    const FilterBox = ({ label, type, value, onChange, options }) => (
        <div className="flex flex-col space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">{label}</label>
            {type === 'select' ? (
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                >
                    {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
            ) : (
                <input
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
            )}
        </div>
    );

    return (
        <AdminLayout title="System Reports">
            <div className="mb-8">
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Data Export Center</h1>
                <p className="text-gray-500 text-sm mt-1">Generate and download official PDF and CSV reports for administrative purposes.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Lost Items Report */}
                <ReportCard
                    title="Lost Items Report"
                    description="Inventory of all items reported missing by students."
                    onExportCSV={() => handleExport('lost-items', 'csv', lostFilters)}
                    onExportPDF={() => handleExport('lost-items', 'pdf', lostFilters)}
                >
                    <FilterBox 
                        label="From Date" type="date" 
                        value={lostFilters.startDate} 
                        onChange={(v) => setLostFilters({...lostFilters, startDate: v})} 
                    />
                    <FilterBox 
                        label="To Date" type="date" 
                        value={lostFilters.endDate} 
                        onChange={(v) => setLostFilters({...lostFilters, endDate: v})} 
                    />
                    <FilterBox 
                        label="Category" type="select" options={categories}
                        value={lostFilters.category} 
                        onChange={(v) => setLostFilters({...lostFilters, category: v})} 
                    />
                    <FilterBox 
                        label="Status" type="select" options={lostStatuses}
                        value={lostFilters.status} 
                        onChange={(v) => setLostFilters({...lostFilters, status: v})} 
                    />
                </ReportCard>

                {/* Claims Report */}
                <ReportCard
                    title="Claim Requests Report"
                    description="History of claim attempts and verification results."
                    onExportCSV={() => handleExport('claims', 'csv', claimsFilters)}
                    onExportPDF={() => handleExport('claims', 'pdf', claimsFilters)}
                >
                    <FilterBox 
                        label="From Date" type="date" 
                        value={claimsFilters.startDate} 
                        onChange={(v) => setClaimsFilters({...claimsFilters, startDate: v})} 
                    />
                    <FilterBox 
                        label="To Date" type="date" 
                        value={claimsFilters.endDate} 
                        onChange={(v) => setClaimsFilters({...claimsFilters, endDate: v})} 
                    />
                    <FilterBox 
                        label="Status" type="select" options={claimStatuses}
                        value={claimsFilters.status} 
                        onChange={(v) => setClaimsFilters({...claimsFilters, status: v})} 
                    />
                </ReportCard>

                {/* Users Report */}
                <ReportCard
                    title="User Registry Report"
                    description="Database snapshot of registered campus users."
                    onExportCSV={() => handleExport('users', 'csv', userFilters)}
                    onExportPDF={() => handleExport('users', 'pdf', userFilters)}
                >
                    <FilterBox 
                        label="User Role" type="select" options={userRoles}
                        value={userFilters.role} 
                        onChange={(v) => setUserFilters({...userFilters, role: v})} 
                    />
                </ReportCard>
                
                {/* Summary Info Card */}
                <div className="bg-indigo-900 rounded-2xl p-8 text-white flex flex-col justify-center relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="text-xl font-bold mb-4">Export Guidelines</h3>
                        <ul className="space-y-3 text-indigo-100 text-sm">
                            <li className="flex items-start gap-2">
                                <span className="p-1 bg-indigo-700 rounded-full mt-0.5">
                                    <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" /></svg>
                                </span>
                                All exports include timestamps and a system authenticity signature.
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="p-1 bg-indigo-700 rounded-full mt-0.5">
                                    <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" /></svg>
                                </span>
                                PDF reports are optimized for printing and official records.
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="p-1 bg-indigo-700 rounded-full mt-0.5">
                                    <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" /></svg>
                                </span>
                                Every export action is logged for security auditing purposes.
                            </li>
                        </ul>
                    </div>
                    {/* Abstract background shape */}
                    <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-indigo-800 rounded-full opacity-50 blur-3xl"></div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default ReportsPage;
