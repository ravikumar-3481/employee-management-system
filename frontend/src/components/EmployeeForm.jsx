import React, { useState, useEffect } from 'react';

export default function EmployeeForm({ employee, onCancel, onSuccess }) {
  const isEditMode = !!employee;
  const [departments, setDepartments] = useState([]);
  
  // Form Fields State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [deptId, setDeptId] = useState('');
  const [designation, setDesignation] = useState('');
  const [salary, setSalary] = useState('');
  const [dateOfJoining, setDateOfJoining] = useState('');
  const [status, setStatus] = useState('Active');
  
  // Status State
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load departments
  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/departments');
        if (res.ok) {
          const data = await res.json();
          setDepartments(data);
          // Set default department if creating
          if (!isEditMode && data.length > 0) {
            setDeptId(data[0].id);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingDepts(false);
      }
    };
    fetchDepts();
  }, [isEditMode]);

  // Pre-populate fields if editing
  useEffect(() => {
    if (employee) {
      setFirstName(employee.first_name || '');
      setLastName(employee.last_name || '');
      setEmail(employee.email || '');
      setPhone(employee.phone || '');
      setDeptId(employee.department_id || '');
      setDesignation(employee.designation || '');
      setSalary(employee.salary || '');
      // Format date string to yyyy-MM-dd
      if (employee.date_of_joining) {
        const rawDate = new Date(employee.date_of_joining);
        const yyyy = rawDate.getFullYear();
        const mm = String(rawDate.getMonth() + 1).padStart(2, '0');
        const dd = String(rawDate.getDate()).padStart(2, '0');
        setDateOfJoining(`${yyyy}-${mm}-${dd}`);
      } else {
        setDateOfJoining('');
      }
      setStatus(employee.status || 'Active');
    }
  }, [employee]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    // Validation checks
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !designation.trim() || !salary || !dateOfJoining) {
      setFormError('Please fill in all required fields.');
      return;
    }

    if (isNaN(salary) || Number(salary) < 0) {
      setFormError('Salary must be a positive number.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setFormError('Please enter a valid email address.');
      return;
    }

    const payload = {
      first_name: firstName,
      last_name: lastName,
      email: email,
      phone: phone || null,
      department_id: Number(deptId),
      designation: designation,
      salary: Number(salary),
      date_of_joining: dateOfJoining,
      status: status
    };

    try {
      setIsSubmitting(true);
      
      const url = isEditMode 
        ? `http://localhost:8000/api/employees/${employee.id}`
        : 'http://localhost:8000/api/employees';
        
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Error saving employee details');
      }

      onSuccess();
    } catch (err) {
      console.error(err);
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingDepts) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
        <div className="spinner">Loading form configurations...</div>
      </div>
    );
  }

  return (
    <div className="form-card">
      <h2 className="chart-title" style={{ fontSize: '22px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '32px' }}>
        {isEditMode ? 'Edit Employee Profile' : 'Add New Employee'}
      </h2>

      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          
          {/* First Name */}
          <div className="form-group">
            <label className="form-label">First Name *</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="your name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>

          {/* Last Name */}
          <div className="form-group">
            <label className="form-label">Last Name *</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="your lastname"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>

          {/* Email Address */}
          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input 
              type="email" 
              className="form-input" 
              placeholder="your email id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Phone Number */}
          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input 
              type="tel" 
              className="form-input" 
              placeholder="your phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          {/* Department */}
          <div className="form-group">
            <label className="form-label">Department *</label>
            <select 
              className="select-filter" 
              style={{ width: '100%' }}
              value={deptId}
              onChange={(e) => setDeptId(e.target.value)}
              required
            >
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
              {departments.length === 0 && (
                <option value="">No departments available - create one first</option>
              )}
            </select>
          </div>

          {/* Designation */}
          <div className="form-group">
            <label className="form-label">Job Title / Designation *</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Senior Frontend Engineer"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              required
            />
          </div>

          {/* Salary */}
          <div className="form-group">
            <label className="form-label">Annual Salary *</label>
            <input 
              type="number" 
              className="form-input" 
              placeholder="e.g. 85000"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              required
            />
          </div>

          {/* Date of Joining */}
          <div className="form-group">
            <label className="form-label">Date of Joining *</label>
            <input 
              type="date" 
              className="form-input" 
              value={dateOfJoining}
              onChange={(e) => setDateOfJoining(e.target.value)}
              required
            />
          </div>

          {/* Employment Status */}
          <div className="form-group form-field-full">
            <label className="form-label">Employment Status</label>
            <select 
              className="select-filter" 
              style={{ width: '100%' }}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

        </div>

        {formError && (
          <div style={{ color: 'var(--color-danger)', fontWeight: '500', marginBottom: '24px' }}>
            ⚠️ {formError}
          </div>
        )}

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Add Employee'}
          </button>
        </div>
      </form>
    </div>
  );
}
