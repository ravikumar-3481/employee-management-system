import React, { useState, useEffect } from 'react';

export default function DepartmentList() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:8000/api/departments');
      if (!res.ok) throw new Error('Failed to fetch departments');
      const data = await res.json();
      setDepartments(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Error loading departments. Please check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Department name is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      
      const res = await fetch('http://localhost:8000/api/departments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, description }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to create department');
      }

      setName('');
      setDescription('');
      fetchDepartments(); // Refresh list
    } catch (err) {
      console.error(err);
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDepartment = async (id) => {
    if (!window.confirm('Are you sure you want to delete this department? Any associated employee data will be updated or deleted accordingly.')) {
      return;
    }

    try {
      const res = await fetch(`http://localhost:8000/api/departments/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to delete department');
      }

      fetchDepartments(); // Refresh list
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  if (loading && departments.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
        <div className="spinner">Loading departments...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px', alignItems: 'start' }}>
      
      {/* Create Department Form */}
      <div className="form-card" style={{ margin: 0, padding: '24px' }}>
        <h3 className="chart-title" style={{ fontSize: '18px', marginBottom: '20px' }}>Add New Department</h3>
        <form onSubmit={handleAddDepartment} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div className="form-group">
            <label className="form-label">Department Name</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Engineering, Finance"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea 
              className="form-input" 
              style={{ minHeight: '80px', resize: 'vertical' }}
              placeholder="Department purpose or overview..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {formError && (
            <div style={{ color: 'var(--color-danger)', fontSize: '14px', fontWeight: '500' }}>
              ⚠️ {formError}
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Department'}
          </button>
        </form>
      </div>

      {/* Departments List */}
      <div className="table-card" style={{ margin: 0 }}>
        <div className="table-header-bar" style={{ padding: '20px 24px' }}>
          <h3 className="chart-title" style={{ margin: 0 }}>Active Departments</h3>
        </div>

        {error ? (
          <div style={{ padding: '24px', color: 'var(--color-danger)' }}>{error}</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ padding: '12px 24px' }}>Department Name</th>
                  <th style={{ padding: '12px 24px' }}>Description</th>
                  <th style={{ padding: '12px 24px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((dept) => (
                  <tr key={dept.id}>
                    <td style={{ padding: '16px 24px', fontWeight: '600', color: 'var(--text-primary)' }}>{dept.name}</td>
                    <td style={{ padding: '16px 24px' }}>{dept.description || <span style={{ color: 'var(--text-muted)' }}>No description</span>}</td>
                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      <button 
                        className="btn btn-secondary btn-icon" 
                        style={{ color: 'var(--color-danger)' }}
                        onClick={() => handleDeleteDepartment(dept.id)}
                        title="Delete Department"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
                {departments.length === 0 && (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                      No departments available. Add one using the form.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
