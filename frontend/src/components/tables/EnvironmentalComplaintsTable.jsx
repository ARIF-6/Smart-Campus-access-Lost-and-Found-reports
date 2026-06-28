import React, { useEffect, useState } from 'react';
import axios from 'axios';

const EnvironmentalComplaintsTable = () => {
  const [complaints, setComplaints] = useState([]);

  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        const res = await axios.get('/api/campus-environment');
        setComplaints(res.data.data.complaints);
      } catch (err) {
        console.error('Failed to fetch complaints', err);
      }
    };
    fetchComplaints();
  }, []);

  return (
    <table className="env-complaints-table">
      <thead>
        <tr>
          <th>Title</th>
          <th>Status</th>
          <th>Submitted By</th>
        </tr>
      </thead>
      <tbody>
        {complaints.map((c) => (
          <tr key={c._id}>
            <td>{c.title}</td>
            <td>{c.status}</td>
            <td>{c.student?.fullName || 'N/A'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default EnvironmentalComplaintsTable;
