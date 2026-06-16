import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import EmployeeList from './components/EmployeeList';
import EmployeeForm from './components/EmployeeForm';
import DepartmentList from './components/DepartmentList';
import AttendanceManager from './components/AttendanceManager';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'employees', 'departments', 'attendance', 'form'
  const [selectedEmployee, setSelectedEmployee] = useState(null); // For edit
  const [viewedEmployee, setViewedEmployee] = useState(null); // For detail modal
  const [theme, setTheme] = useState('dark'); // Default dark theme

  // Handle system theme updates
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  // Helper for rendering view
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            onViewEmployee={(emp) => setViewedEmployee(emp)} 
          />
        );
      case 'employees':
        return (
          <EmployeeList 
            onAddEmployee={() => {
              setSelectedEmployee(null);
              setActiveTab('form');
            }}
            onEditEmployee={(emp) => {
              setSelectedEmployee(emp);
              setActiveTab('form');
            }}
            onViewEmployee={(emp) => setViewedEmployee(emp)}
          />
        );
      case 'departments':
        return <DepartmentList />;
      case 'attendance':
        return <AttendanceManager />;
      case 'form':
        return (
          <EmployeeForm 
            employee={selectedEmployee}
            onCancel={() => {
              setSelectedEmployee(null);
              setActiveTab('employees');
            }}
            onSuccess={() => {
              setSelectedEmployee(null);
              setActiveTab('employees');
            }}
          />
        );
      default:
        return <Dashboard onViewEmployee={(emp) => setViewedEmployee(emp)} />;
    }
  };

  const getInitials = (first, last) => {
    return `${first?.charAt(0) || ''}${last?.charAt(0) || ''}`.toUpperCase();
  };

  const formatSalary = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="app-container">
      
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="logo-container">
          <div className="logo-icon">EMS</div>
          <span className="logo-text">StaffPortal</span>
        </div>

        <ul className="nav-links">
          <li>
            <button 
              className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
              style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px' }}
            >
              <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="9" />
                <rect x="14" y="3" width="7" height="5" />
                <rect x="14" y="12" width="7" height="9" />
                <rect x="3" y="16" width="7" height="5" />
              </svg>
              <span>Dashboard</span>
            </button>
          </li>
          <li>
            <button 
              className={`nav-item ${activeTab === 'employees' || activeTab === 'form' ? 'active' : ''}`}
              onClick={() => setActiveTab('employees')}
              style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px' }}
            >
              <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span>Employees</span>
            </button>
          </li>
          <li>
            <button 
              className={`nav-item ${activeTab === 'departments' ? 'active' : ''}`}
              onClick={() => setActiveTab('departments')}
              style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px' }}
            >
              <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
              <span>Departments</span>
            </button>
          </li>
          <li>
            <button 
              className={`nav-item ${activeTab === 'attendance' ? 'active' : ''}`}
              onClick={() => setActiveTab('attendance')}
              style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px' }}
            >
              <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
              <span>Attendance</span>
            </button>
          </li>
        </ul>

        {/* Theme Toggle in Sidebar */}
        <div className="theme-toggle-container">
          <div className="theme-switch">
            <span>Dark Mode</span>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={theme === 'dark'}
                onChange={toggleTheme}
              />
              <span className="slider"></span>
            </label>
          </div>
        </div>
      </aside>

      {/* Main Content Layout */}
      <div className="main-wrapper">
        <header className="header">
          <h1 className="header-title">
            {activeTab === 'dashboard' && 'Dashboard Overview'}
            {activeTab === 'employees' && 'Employee Directory'}
            {activeTab === 'departments' && 'Department Directory'}
            {activeTab === 'attendance' && 'Daily Attendance Log'}
            {activeTab === 'form' && (selectedEmployee ? 'Modify Employee Profile' : 'Register New Employee')}
          </h1>

          <div className="user-profile">
            <div className="user-avatar">AD</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '14px', fontWeight: '600' }}>Admin Portal</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Super Admin</span>
            </div>
          </div>
        </header>

        <main className="content-body">
          {renderContent()}
        </main>
      </div>

      {/* Modal Profile Viewer */}
      {viewedEmployee && (
        <div className="modal-overlay" onClick={() => setViewedEmployee(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="chart-title" style={{ margin: 0 }}>Employee Directory Card</h3>
              <button className="modal-close-btn" onClick={() => setViewedEmployee(null)}>
                &times;
              </button>
            </div>

            <div className="modal-profile-header">
              <div className="modal-profile-avatar">
                {getInitials(viewedEmployee.first_name, viewedEmployee.last_name)}
              </div>
              <div>
                <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '24px', fontWeight: '700' }}>
                  {viewedEmployee.first_name} {viewedEmployee.last_name}
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                  {viewedEmployee.designation} &bull; {viewedEmployee.department?.name || 'No Department'}
                </p>
              </div>
            </div>

            <div className="modal-info-grid">
              <div className="modal-info-item">
                <span className="modal-info-label">Email Address</span>
                <span className="modal-info-value">{viewedEmployee.email}</span>
              </div>
              <div className="modal-info-item">
                <span className="modal-info-label">Phone Number</span>
                <span className="modal-info-value">{viewedEmployee.phone || 'N/A'}</span>
              </div>
              <div className="modal-info-item">
                <span className="modal-info-label">Employment Status</span>
                <span className="modal-info-value">
                  <span className={`badge ${viewedEmployee.status === 'Active' ? 'badge-active' : 'badge-inactive'}`}>
                    {viewedEmployee.status}
                  </span>
                </span>
              </div>
              <div className="modal-info-item">
                <span className="modal-info-label">Annual Salary</span>
                <span className="modal-info-value">{formatSalary(viewedEmployee.salary)}</span>
              </div>
              <div className="modal-info-item">
                <span className="modal-info-label">Date of Joining</span>
                <span className="modal-info-value">
                  {new Date(viewedEmployee.date_of_joining).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
              <div className="modal-info-item">
                <span className="modal-info-label">Internal ID</span>
                <span className="modal-info-value">#EMP-{viewedEmployee.id.toString().padStart(4, '0')}</span>
              </div>
            </div>

            <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setViewedEmployee(null)}
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
