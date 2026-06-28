import React, { useState } from 'react';

// Minimal DataTable component used by CategoryManagement.
// Props:
// - data: array of objects representing categories (must have at least an 'id' and 'name')
// - loading: boolean to indicate loading state
// - onCreate: async function to create a new item (receives an object)
// - onUpdate: async function to update an item (receives id and object)
// - onDelete: async function to delete an item (receives id)

const DataTable = ({ data = [], loading = false, onCreate, onUpdate, onDelete }) => {
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');

  const getItemId = (item) => item?._id || item?.id;

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await onCreate({ name: newName.trim() });
    setNewName('');
  };

  const startEdit = (item) => {
    setEditId(getItemId(item));
    setEditName(item.name || '');
  };

  const handleUpdate = async () => {
    if (editId == null) return;
    await onUpdate(editId, { name: editName.trim() });
    setEditId(null);
    setEditName('');
  };

  const handleDelete = async (item) => {
    const id = getItemId(item);
    if (window.confirm('Delete this category?')) {
      await onDelete(id);
    }
  };

  return (
    <div className="overflow-x-auto text-gray-800">
      {loading && <p className="text-gray-500 mb-2">Loading...</p>}
      <table className="min-w-full bg-white border border-gray-200 rounded-md">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-4 py-2 text-left font-semibold">Name</th>
            <th className="px-4 py-2 text-left font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan="2" className="px-4 py-8 text-center text-gray-500">
                No categories found. Add one below!
              </td>
            </tr>
          ) : (
            data.map((item) => {
              const itemId = getItemId(item);
              return (
                <tr key={itemId} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">
                    {editId === itemId ? (
                      <input
                        className="border rounded p-1 w-full text-gray-900"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    ) : (
                      item.name || item.title || '(Unnamed)'
                    )}
                  </td>
                  <td className="px-4 py-2 space-x-2">
                    {editId === itemId ? (
                      <>
                        <button
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-sm transition-colors"
                          onClick={handleUpdate}
                        >
                          Save
                        </button>
                        <button
                          className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-3 py-1 rounded text-sm transition-colors"
                          onClick={() => setEditId(null)}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm transition-colors"
                          onClick={() => startEdit(item)}
                        >
                          Edit
                        </button>
                        <button
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                          onClick={() => handleDelete(item)}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      {/* Add new category */}
      <div className="mt-4 flex space-x-2">
        <input
          className="border border-gray-300 rounded p-2 flex-1 text-gray-900"
          placeholder="New category name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded font-medium transition-colors"
          onClick={handleAdd}
        >
          Add Category
        </button>
      </div>
    </div>
  );
};

export default DataTable;
