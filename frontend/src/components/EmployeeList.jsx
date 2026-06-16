import React, { useState, useEffect } from 'react';

export default function EmployeeList({ onAddEmployee, onEditEmployee, onViewEmployee }) {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Search, Filter, Sort and Pagination State
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10; // Items per page
  
  // Sorting state
  const [sortBy, setSortBy] = useState('id'); // Sorting logic can be done on frontend or backend
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'

  // Fetch departments for filter dropdown
  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/departments');
        if (res.ok) {
          const data = await res.json();
          setDepartments(data);
        }
      } catch (err) {
        console.error('Failed to fetch departments:', err);
      }
    };
    fetchDepts();
  }, []);

  // Fetch employees when search, filters, or page change
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      
      let url = `http://localhost:8000/api/employees?page=${page}&limit=${limit}`;
      if (search.trim()) url += `&search=${encodeURIComponent(search)}`;
      if (selectedDept) url += `&department_id=${selectedDept}`;
      if (selectedStatus) url += `&status=${selectedStatus}`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch employee list');
      
      const data = await res.json();
      setEmployees(data.employees || []);
      setTotal(data.total || 0);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Error loading employees. Please make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [search, selectedDept, selectedStatus, page]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete employee ${name}?`)) {
      return;
    }
    
    try {
      const res = await fetch(`http://localhost:8000/api/employees/${id}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) throw new Error('Failed to delete employee');
      
      // If we are on a page that becomes empty after deletion, go back a page
      const newTotal = total - 1;
      const maxPages = Math.ceil(newTotal / limit) || 1;
      if (page > maxPages) {
        setPage(maxPages);
      } else {
        fetchEmployees();
      }
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  // Helper for sorting
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Sort client-side for immediate responsive sorting
  const sortedEmployees = [...employees].sort((a, b) => {
    let valA, valB;
    
    if (sortBy === 'name') {
      valA = `${a.first_name} ${a.last_name}`.toLowerCase();
      valB = `${b.first_name} ${b.last_name}`.toLowerCase();
    } else if (sortBy === 'department') {
      valA = (a.department?.name || '').toLowerCase();
      valB = (b.department?.name || '').toLowerCase();
    } else {
      valA = a[sortBy];
      valB = b[sortBy];
      
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const getInitials = (first, last) => {
    return `${first?.charAt(0) || ''}${last?.charAt(0) || ''}`.toUpperCase();
  };

  const totalPages = Math.ceil(total / limit) || 1;

  // Currency Formatter
  const formatSalary = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="table-card">
      <div className="table-header-bar">
        {/* Search & Filters */}
        <div className="table-search-filters">
          <input 
            type="text" 
            className="input-search" 
            placeholder="Search by name, email or job title..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1); // Reset page on new search
            }}
          />

          <select 
            className="select-filter"
            value={selectedDept}
            onChange={(e) => {
              setSelectedDept(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Departments</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>

          <select 
            className="select-filter"
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        {/* Add Employee CTA */}
        <button className="btn btn-primary" onClick={onAddEmployee}>
          <span>➕</span> Add Employee
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div className="spinner">Loading employees...</div>
        </div>
      ) : error ? (
        <div style={{ padding: '24px', color: 'var(--color-danger)' }}>{error}</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('name')}>
                  Employee {sortBy === 'name' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => handleSort('designation')}>
                  Designation {sortBy === 'designation' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => handleSort('department')}>
                  Department {sortBy === 'department' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => handleSort('salary')}>
                  Salary {sortBy === 'salary' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => handleSort('date_of_joining')}>
                  Joined {sortBy === 'date_of_joining' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th onClick={() => handleSort('status')}>
                  Status {sortBy === 'status' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                </th>
                <th style={{ textAlign: 'right', cursor: 'default' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedEmployees.map((emp) => (
                <tr key={emp.id}>
                  {/* Name & Avatar */}
                  <td>
                    <div className="employee-avatar-wrapper">
                      <div className="employee-avatar-circle">
                        {getInitials(emp.first_name, emp.last_name)}
                      </div>
                      <div className="employee-name-details">
                        <span className="employee-name-text">{emp.first_name} {emp.last_name}</span>
                        <span className="employee-email-text">{emp.email}</span>
                      </div>
                    </div>
                  </td>
                  
                  {/* Designation */}
                  <td>{emp.designation}</td>
                  
                  {/* Department */}
                  <td>{emp.department?.name || <span style={{ color: 'var(--text-muted)' }}>None</span>}</td>
                  
                  {/* Salary */}
                  <td>{formatSalary(emp.salary)}</td>
                  
                  {/* Join Date */}
                  <td>{new Date(emp.date_of_joining).toLocaleDateString()}</td>
                  
                  {/* Status */}
                  <td>
                    <span className={`badge ${emp.status === 'Active' ? 'badge-active' : 'badge-inactive'}`}>
                      {emp.status}
                    </span>
                  </td>
                  
                  {/* Actions */}
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '8px' }}>
                      <button 
                        className="btn btn-secondary btn-icon" 
                        onClick={() => onViewEmployee(emp)}
                        title="View Details"
                      >
                        👁️
                      </button>
                      <button 
                        className="btn btn-secondary btn-icon" 
                        onClick={() => onEditEmployee(emp)}
                        title="Edit Employee"
                      >
                        ✏️
                      </button>
                      <button 
                        className="btn btn-secondary btn-icon" 
                        style={{ color: 'var(--color-danger)' }}
                        onClick={() => handleDelete(emp.id, `${emp.first_name} ${emp.last_name}`)}
                        title="Delete Employee"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {sortedEmployees.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No employees found matching the filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="pagination-container">
        <div className="pagination-info">
          Showing {employees.length > 0 ? (page - 1) * limit + 1 : 0} to {Math.min(page * limit, total)} of {total} employees
        </div>
        <div className="pagination-actions">
          <button 
            className="btn btn-secondary" 
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            ◀ Previous
          </button>
          <button 
            className="btn btn-secondary" 
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next ▶
          </button>
        </div>
      </div>
    </div>
  );
}
