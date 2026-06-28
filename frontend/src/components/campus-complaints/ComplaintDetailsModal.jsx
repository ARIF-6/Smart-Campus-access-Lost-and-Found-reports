import React, { useEffect, useState } from 'react';
import axios from 'axios';
import InfoTab from './InfoTab';
import TimelineTab from './TimelineTab';
import ManageTab from './ManageTab';

const ComplaintDetailsModal = ({ complaintId, onClose, onUpdate }) => {
  const [complaint, setComplaint] = useState(null);
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    const fetchComplaint = async () => {
      try {
        const res = await axios.get(`/api/campus-environment/${complaintId}`);
        setComplaint(res.data.data);
      } catch (err) {
        console.error('Failed to fetch complaint', err);
      }
    };
    fetchComplaint();
  }, [complaintId]);

  if (!complaint) return null;

  const renderTab = () => {
    switch (activeTab) {
      case 'info':
        return <InfoTab reporter={complaint.reporter} />;
      case 'timeline':
        return <TimelineTab tracking={complaint.tracking} />;
      case 'manage':
        return <ManageTab complaint={complaint} onUpdate={onUpdate} />;
      default:
        return null;
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="close-btn" onClick={onClose}>✖</button>
        <h2>{complaint.title}</h2>
        <div className="tabs">
          <button onClick={() => setActiveTab('info')} className={activeTab === 'info' ? 'active' : ''}>Info</button>
          <button onClick={() => setActiveTab('timeline')} className={activeTab === 'timeline' ? 'active' : ''}>Timeline</button>
          <button onClick={() => setActiveTab('manage')} className={activeTab === 'manage' ? 'active' : ''}>Manage</button>
        </div>
        <div className="tab-content">{renderTab()}</div>
      </div>
    </div>
  );
};

export default ComplaintDetailsModal;
