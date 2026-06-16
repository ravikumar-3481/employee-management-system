import { useState, useEffect } from 'react';

export default function AttendanceManager() {
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [employees, setEmployees] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingAll, setSavingAll] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch employees and attendance logs for the selected date
  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch active employees (limit to 200 for attendance sheets)
      const empRes = await fetch('http://localhost:8000/api/employees?limit=200&status=Active');
      if (!empRes.ok) throw new Error('Failed to fetch active employees list');
      const empData = await empRes.json();
      const activeEmps = empData.employees || [];
      setEmployees(activeEmps);

      // Fetch attendance logs for selected date
      const attRes = await fetch(`http://localhost:8000/api/attendance?date=${selectedDate}`);
      if (!attRes.ok) throw new Error('Failed to fetch attendance logs');
      const attLogs = await attRes.json();

      // Create mapping of employee_id -> attendance record
      const logMap = {};
      attLogs.forEach(log => {
        logMap[log.employee_id] = {
          id: log.id,
          status: log.status,
          check_in: log.check_in || '09:00',
          check_out: log.check_out || 17 + ':' + '00', // e.g. 17:00
          isDirty: false,
          isSaving: false
        };
      });

      // Construct final UI map
      const initialMap = {};
      activeEmps.forEach(emp => {
        if (logMap[emp.id]) {
          initialMap[emp.id] = logMap[emp.id];
        } else {
          // Default unmarked state
          initialMap[emp.id] = {
            id: null,
            status: 'Unmarked',
            check_in: '09:00',
            check_out: '17:00',
            isDirty: false,
            isSaving: false
          };
        }
      });

      setAttendanceMap(initialMap);
    } catch (err) {
      console.error(err);
      setError('Error loading attendance logs. Make sure backend API is accessible.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
  }, [selectedDate]);

  // Handle single employee status / time change
  const handleRecordChange = (empId, fields) => {
    setAttendanceMap(prev => {
      const current = prev[empId] || {};
      
      // Calculate times validation/updates
      let check_in = fields.check_in !== undefined ? fields.check_in : current.check_in;
      let check_out = fields.check_out !== undefined ? fields.check_out : current.check_out;
      
      return {
        ...prev,
        [empId]: {
          ...current,
          ...fields,
          check_in,
          check_out,
          isDirty: true
        }
      };
    });
  };

  // Save single attendance row
  const saveRecord = async (empId) => {
    const record = attendanceMap[empId];
    if (!record) return;

    try {
      // Mark as saving in UI
      setAttendanceMap(prev => ({
        ...prev,
        [empId]: { ...prev[empId], isSaving: true }
      }));

      const body = {
        employee_id: empId,
        date: selectedDate,
        status: record.status === 'Unmarked' ? 'Absent' : record.status,
        check_in: ['Present', 'Late'].includes(record.status) ? record.check_in : null,
        check_out: ['Present', 'Late'].includes(record.status) ? record.check_out : null
      };

      const res = await fetch('http://localhost:8000/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) throw new Error('Failed to save attendance log');
      const data = await res.json();

      // Reset state status
      setAttendanceMap(prev => ({
        ...prev,
        [empId]: {
          ...prev[empId],
          id: data.id,
          status: data.status,
          check_in: data.check_in || '09:00',
          check_out: data.check_out || '17:00',
          isDirty: false,
          isSaving: false
        }
      }));

      showToast(`Logged attendance for employee successfully.`);
    } catch (err) {
      console.error(err);
      alert('Failed to save attendance record.');
      setAttendanceMap(prev => ({
        ...prev,
        [empId]: { ...prev[empId], isSaving: false }
      }));
    }
  };

  // Bulk set status for all unmarked employees (or all employees)
  const applyBulkStatus = async (statusVal) => {
    const defaultTimes = {
      Present: { check_in: '09:00', check_out: '17:00' },
      Late: { check_in: '09:30', check_out: '17:00' },
      Absent: { check_in: null, check_out: null },
      'On Leave': { check_in: null, check_out: null }
    };

    const updatedRecords = [];
    const bulkDataRecords = [];

    employees.forEach(emp => {
      const current = attendanceMap[emp.id];
      if (current) {
        const check_in = defaultTimes[statusVal].check_in;
        const check_out = defaultTimes[statusVal].check_out;

        bulkDataRecords.push({
          employee_id: emp.id,
          date: selectedDate,
          status: statusVal,
          check_in,
          check_out
        });
      }
    });

    if (bulkDataRecords.length === 0) return;

    try {
      setSavingAll(true);
      const res = await fetch('http://localhost:8000/api/attendance/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          records: bulkDataRecords
        })
      });

      if (!res.ok) throw new Error('Bulk update failed');

      // Refresh database records
      await fetchAttendanceData();
      showToast(`Successfully updated all ${bulkDataRecords.length} records to "${statusVal}".`);
    } catch (err) {
      console.error(err);
      alert('Failed to apply bulk operations.');
    } finally {
      setSavingAll(false);
    }
  };

  // Save all modified dirty records
  const saveAllDirty = async () => {
    const dirtyIds = Object.keys(attendanceMap).filter(id => attendanceMap[id].isDirty);
    if (dirtyIds.length === 0) {
      showToast('No modifications to save.');
      return;
    }

    try {
      setSavingAll(true);
      const recordsToPost = dirtyIds.map(id => {
        const record = attendanceMap[id];
        return {
          employee_id: parseInt(id),
          date: selectedDate,
          status: record.status === 'Unmarked' ? 'Absent' : record.status,
          check_in: ['Present', 'Late'].includes(record.status) ? record.check_in : null,
          check_out: ['Present', 'Late'].includes(record.status) ? record.check_out : null
        };
      });

      const res = await fetch('http://localhost:8000/api/attendance/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          records: recordsToPost
        })
      });

      if (!res.ok) throw new Error('Bulk saving failed');
      await fetchAttendanceData();
      showToast(`Successfully saved ${recordsToPost.length} attendance modifications.`);
    } catch (err) {
      console.error(err);
      alert('Failed to save modifications.');
    } finally {
      setSavingAll(false);
    }
  };

  // Utility toast system
  const showToast = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg('');
    }, 4000);
  };

  // Calculate live stats from state map
  const getStats = () => {
    const counts = { Present: 0, Late: 0, Absent: 0, 'On Leave': 0, Unmarked: 0 };
    Object.values(attendanceMap).forEach(item => {
      if (counts[item.status] !== undefined) {
        counts[item.status]++;
      }
    });
    return counts;
  };

  const statCounts = getStats();
  const getInitials = (first, last) => `${first?.charAt(0) || ''}${last?.charAt(0) || ''}`.toUpperCase();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top action header: date selector and saving tools */}
      <div className="table-header-bar" style={{ borderRadius: 'var(--radius-lg)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '20px 24px' }}>
        <div className="date-picker-wrapper">
          <span className="form-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>Select Log Date:</span>
          <input 
            type="date" 
            className="date-picker-input" 
            value={selectedDate}
            max={new Date().toISOString().split('T')[0]}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="btn btn-secondary"
            onClick={fetchAttendanceData}
            title="Reload Logs"
          >
            <span>🔄</span> Reload
          </button>
          <button 
            className="btn btn-primary"
            onClick={saveAllDirty}
            disabled={savingAll || !Object.values(attendanceMap).some(r => r.isDirty)}
            style={{ opacity: Object.values(attendanceMap).some(r => r.isDirty) ? 1 : 0.6 }}
          >
            {savingAll ? 'Saving...' : '💾 Save All Changes'}
          </button>
        </div>
      </div>

      {/* Dynamic Success Toast */}
      {successMsg && (
        <div style={{
          backgroundColor: 'var(--color-success-soft)',
          borderLeft: '4px solid var(--color-success)',
          color: 'var(--color-success)',
          padding: '12px 18px',
          borderRadius: 'var(--radius-md)',
          fontWeight: '500',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'modalFadeIn 0.2s ease-out'
        }}>
          <span>✅</span> {successMsg}
        </div>
      )}

      {/* Attendance Metrics Cards */}
      <div className="attendance-grid">
        <div className="attendance-card" style={{ borderLeft: '4px solid var(--color-success)' }}>
          <div className="attendance-card-icon" style={{ backgroundColor: 'var(--color-success-soft)', color: 'var(--color-success)' }}>
            ✓
          </div>
          <div className="attendance-card-details">
            <span className="attendance-card-title">Present</span>
            <span className="attendance-card-value">{statCounts.Present}</span>
          </div>
        </div>

        <div className="attendance-card" style={{ borderLeft: '4px solid var(--color-warning)' }}>
          <div className="attendance-card-icon" style={{ backgroundColor: 'var(--color-warning-soft)', color: 'var(--color-warning)' }}>
            ⏰
          </div>
          <div className="attendance-card-details">
            <span className="attendance-card-title">Late Check-in</span>
            <span className="attendance-card-value">{statCounts.Late}</span>
          </div>
        </div>

        <div className="attendance-card" style={{ borderLeft: '4px solid var(--color-danger)' }}>
          <div className="attendance-card-icon" style={{ backgroundColor: 'var(--color-danger-soft)', color: 'var(--color-danger)' }}>
            ✗
          </div>
          <div className="attendance-card-details">
            <span className="attendance-card-title">Absent</span>
            <span className="attendance-card-value">{statCounts.Absent}</span>
          </div>
        </div>

        <div className="attendance-card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div className="attendance-card-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            ⛱
          </div>
          <div className="attendance-card-details">
            <span className="attendance-card-title">On Leave</span>
            <span className="attendance-card-value">{statCounts['On Leave']}</span>
          </div>
        </div>
      </div>

      {/* Bulk operation control panel */}
      <div className="bulk-panel">
        <div className="bulk-title">
          <span>⚡</span>
          <span><strong>Bulk Actions:</strong> Mark all active employees on this date as:</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-secondary" 
            style={{ color: 'var(--color-success)', border: '1px solid rgba(52, 211, 153, 0.2)' }}
            onClick={() => applyBulkStatus('Present')}
            disabled={savingAll}
          >
            Present (9 AM - 5 PM)
          </button>
          <button 
            className="btn btn-secondary" 
            style={{ color: 'var(--color-warning)', border: '1px solid rgba(251, 191, 36, 0.2)' }}
            onClick={() => applyBulkStatus('Late')}
            disabled={savingAll}
          >
            Late (9:30 AM - 5 PM)
          </button>
          <button 
            className="btn btn-secondary" 
            style={{ color: 'var(--color-danger)', border: '1px solid rgba(248, 113, 113, 0.2)' }}
            onClick={() => applyBulkStatus('Absent')}
            disabled={savingAll}
          >
            Absent
          </button>
          <button 
            className="btn btn-secondary" 
            style={{ color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' }}
            onClick={() => applyBulkStatus('On Leave')}
            disabled={savingAll}
          >
            On Leave
          </button>
        </div>
      </div>

      {/* Main logs table */}
      <div className="table-card" style={{ margin: 0 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <div className="spinner">Fetching date registers...</div>
          </div>
        ) : error ? (
          <div style={{ padding: '32px', color: 'var(--color-danger)', textAlign: 'center' }}>
            <p>{error}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Employee Info</th>
                  <th>Department</th>
                  <th style={{ width: '320px' }}>Log Status</th>
                  <th>Check-In / Out Times</th>
                  <th style={{ textAlign: 'right', width: '120px' }}>Row Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => {
                  const record = attendanceMap[emp.id] || {
                    status: 'Unmarked',
                    check_in: '09:00',
                    check_out: '17:00',
                    isDirty: false,
                    isSaving: false
                  };

                  const isTimeRequired = ['Present', 'Late'].includes(record.status);

                  return (
                    <tr key={emp.id} style={{ backgroundColor: record.isDirty ? 'rgba(99, 102, 241, 0.03)' : 'transparent' }}>
                      {/* Name / Avatar */}
                      <td>
                        <div className="employee-avatar-wrapper">
                          <div className="employee-avatar-circle" style={{ width: '36px', height: '36px', fontSize: '13px' }}>
                            {getInitials(emp.first_name, emp.last_name)}
                          </div>
                          <div className="employee-name-details">
                            <span className="employee-name-text" style={{ fontSize: '14px' }}>
                              {emp.first_name} {emp.last_name}
                            </span>
                            <span className="employee-email-text" style={{ fontSize: '11px' }}>
                              {emp.designation}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td>
                        <span style={{ fontSize: '13px' }}>
                          {emp.department?.name || 'Unassigned'}
                        </span>
                      </td>

                      {/* Log Status Switcher */}
                      <td>
                        <div className="status-btn-group">
                          <button
                            type="button"
                            className={`status-btn status-btn-present ${record.status === 'Present' ? 'active' : ''}`}
                            onClick={() => handleRecordChange(emp.id, { status: 'Present' })}
                          >
                            Present
                          </button>
                          <button
                            type="button"
                            className={`status-btn status-btn-late ${record.status === 'Late' ? 'active' : ''}`}
                            onClick={() => handleRecordChange(emp.id, { status: 'Late' })}
                          >
                            Late
                          </button>
                          <button
                            type="button"
                            className={`status-btn status-btn-absent ${record.status === 'Absent' ? 'active' : ''}`}
                            onClick={() => handleRecordChange(emp.id, { status: 'Absent' })}
                          >
                            Absent
                          </button>
                          <button
                            type="button"
                            className={`status-btn status-btn-leave ${record.status === 'On Leave' ? 'active' : ''}`}
                            onClick={() => handleRecordChange(emp.id, { status: 'On Leave' })}
                          >
                            Leave
                          </button>
                        </div>
                      </td>

                      {/* Check-In / Check-Out Times */}
                      <td>
                        {isTimeRequired ? (
                          <div className="time-input-container">
                            <input
                              type="time"
                              className="time-picker"
                              value={record.check_in}
                              onChange={(e) => handleRecordChange(emp.id, { check_in: e.target.value })}
                            />
                            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>to</span>
                            <input
                              type="time"
                              className="time-picker"
                              value={record.check_out}
                              onChange={(e) => handleRecordChange(emp.id, { check_out: e.target.value })}
                            />
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>
                            Times not applicable
                          </span>
                        )}
                      </td>

                      {/* Row Action Save Button */}
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className={`btn ${record.isDirty ? 'btn-primary' : 'btn-secondary'}`}
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            opacity: record.isDirty || record.isSaving ? 1 : 0.5,
                            pointerEvents: record.isSaving ? 'none' : 'auto'
                          }}
                          onClick={() => saveRecord(emp.id)}
                          disabled={!record.isDirty || record.isSaving}
                        >
                          {record.isSaving ? '...' : record.isDirty ? '💾 Save' : '✓ Synced'}
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {employees.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      No active employees found to log attendance. Add active staff first!
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
