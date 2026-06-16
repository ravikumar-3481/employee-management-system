import { useState, useEffect } from 'react';

export default function Dashboard({ onViewEmployee }) {
  const [stats, setStats] = useState(null);
  const [recentEmployees, setRecentEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Chart hover states
  const [hoveredSegment, setHoveredSegment] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [tooltip, setTooltip] = useState({ x: 0, y: 0, title: '', content: '', visible: false });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Fetch stats
        const statsRes = await fetch('http://localhost:8000/api/dashboard/stats');
        if (!statsRes.ok) throw new Error('Failed to fetch dashboard metrics');
        const statsData = await statsRes.json();
        setStats(statsData);

        // Fetch recent employees (limit 5)
        const empRes = await fetch('http://localhost:8000/api/employees?limit=5');
        if (!empRes.ok) throw new Error('Failed to fetch recent employees');
        const empData = await empRes.json();
        setRecentEmployees(empData.employees || []);
        
        setError(null);
      } catch (err) {
        console.error(err);
        setError('Error loading dashboard data. Please make sure the backend is running.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
        <div className="spinner">Loading Dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px', backgroundColor: 'var(--color-danger-soft)', borderRadius: 'var(--radius-md)', color: 'var(--color-danger)' }}>
        <p>{error}</p>
      </div>
    );
  }

  // Helper to get initials
  const getInitials = (first, last) => {
    return `${first?.charAt(0) || ''}${last?.charAt(0) || ''}`.toUpperCase();
  };

  // Format currency
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  // Find max count for relative department bar charting
  const maxDeptCount = stats?.department_distribution?.length > 0
    ? Math.max(...stats.department_distribution.map(d => d.count))
    : 1;

  // --- Today's Donut Chart Data preparation ---
  const donutRadius = 65;
  const donutCircumference = 2 * Math.PI * donutRadius; // ~408.4
  const summaryToday = stats?.attendance_summary_today || { Present: 0, Late: 0, Absent: 0, 'On Leave': 0 };
  
  const segments = [
    { name: 'Present', value: summaryToday['Present'] || 0, color: 'var(--color-success)' },
    { name: 'Late', value: summaryToday['Late'] || 0, color: 'var(--color-warning)' },
    { name: 'Absent', value: summaryToday['Absent'] || 0, color: 'var(--color-danger)' },
    { name: 'On Leave', value: summaryToday['On Leave'] || 0, color: '#3b82f6' }
  ];

  const totalTodayCount = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  
  let accumulatedOffset = 0;
  const donutData = segments.map(s => {
    const percentage = (s.value / totalTodayCount) * 100;
    const strokeLength = (s.value / totalTodayCount) * donutCircumference;
    const offset = accumulatedOffset;
    accumulatedOffset += strokeLength;
    return { ...s, percentage, strokeLength, offset };
  });

  // --- 7-Day Trend Chart Coordinate calculation ---
  const trend = stats?.attendance_trend || [];
  const svgWidth = 500;
  const svgHeight = 220;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 35;
  
  const chartWidth = svgWidth - padLeft - padRight;
  const chartHeight = svgHeight - padTop - padBottom;

  const trendPoints = trend.map((item, idx) => {
    const x = padLeft + idx * (chartWidth / Math.max(1, trend.length - 1));
    const y = (padTop + chartHeight) - (item.attendance_rate / 100) * chartHeight;
    return { x, y, ...item };
  });

  // Smooth Bezier path generator
  const getBezierPath = (pts) => {
    if (pts.length === 0) return '';
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cp1x = p0.x + (p1.x - p0.x) / 3;
      const cp1y = p0.y;
      const cp2x = p0.x + 2 * (p1.x - p0.x) / 3;
      const cp2y = p1.y;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const linePath = getBezierPath(trendPoints);
  const areaPath = trendPoints.length > 0 
    ? `${linePath} L ${trendPoints[trendPoints.length - 1].x} ${padTop + chartHeight} L ${trendPoints[0].x} ${padTop + chartHeight} Z`
    : '';

  const handleMouseMove = (e, title, content) => {
    const rect = e.currentTarget.closest('.chart-container').getBoundingClientRect();
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top - 60,
      title,
      content,
      visible: true
    });
  };

  const handleMouseLeave = () => {
    setTooltip(prev => ({ ...prev, visible: false }));
  };

  return (
    <div>
      {/* Metrics Cards */}
      <div className="dashboard-grid">
        <div className="metric-card">
          <div className="metric-header">
            <span>Total Staff Directory</span>
            <div className="metric-icon">
              <svg style={{ width: '20px', height: '20px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
          </div>
          <div className="metric-value">{stats?.total_employees || 0}</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>Today's Attendance Rate</span>
            <div className="metric-icon">
              <svg style={{ width: '20px', height: '20px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
          </div>
          <div className="metric-value">
            {stats?.attendance_rate_today || 0}% 
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 'normal', marginLeft: '6px' }}>
              ({stats?.attendance_summary_today?.Present + stats?.attendance_summary_today?.Late || 0} active today)
            </span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>Avg Active Salary</span>
            <div className="metric-icon">
              <svg style={{ width: '20px', height: '20px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
          </div>
          <div className="metric-value">{formatCurrency(stats?.average_salary || 0)}</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>Est. Monthly Payroll</span>
            <div className="metric-icon">
              <svg style={{ width: '20px', height: '20px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
                <path d="M6 14h.01M10 14h.01M14 14h.01M18 14h.01" />
              </svg>
            </div>
          </div>
          <div className="metric-value">{formatCurrency((stats?.total_payroll || 0) / 12)}</div>
        </div>
      </div>

      {/* Visual Analytics Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px', marginBottom: '40px', alignItems: 'start' }}>
        {/* Trend Area/Line Chart */}
        <div className="chart-card chart-container" style={{ margin: 0 }}>
          <h3 className="chart-title">
            <span>Attendance Trend (Last 7 Days)</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'normal' }}>Daily Presence Rate</span>
          </h3>

          <div style={{ position: 'relative' }}>
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="chart-svg" style={{ width: '100%', height: 'auto' }}>
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 25, 50, 75, 100].map((level, i) => {
                const y = (padTop + chartHeight) - (level / 100) * chartHeight;
                return (
                  <g key={i}>
                    <line x1={padLeft} y1={y} x2={svgWidth - padRight} y2={y} className="chart-grid-line" />
                    <text x={padLeft - 10} y={y + 4} className="chart-axis-text" textAnchor="end">{level}%</text>
                  </g>
                );
              })}

              {/* Trend Area */}
              {trendPoints.length > 0 && (
                <path d={areaPath} className="chart-area" />
              )}

              {/* Trend Line */}
              {trendPoints.length > 0 && (
                <path d={linePath} className="chart-line animated-chart-line" />
              )}

              {/* Trend Nodes */}
              {trendPoints.map((pt, idx) => (
                <circle
                  key={idx}
                  cx={pt.x}
                  cy={pt.y}
                  r={hoveredNode === idx ? 6 : 4.5}
                  className="chart-node"
                  style={{
                    fill: hoveredNode === idx ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                    stroke: 'var(--accent-primary)'
                  }}
                  onMouseEnter={(e) => {
                    setHoveredNode(idx);
                    handleMouseMove(
                      e, 
                      new Date(pt.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' }),
                      `Presence Rate: ${pt.attendance_rate}%\n(${pt.present_count} of ${pt.total_count} marked present)`
                    );
                  }}
                  onMouseMove={(e) => {
                    handleMouseMove(
                      e,
                      new Date(pt.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' }),
                      `Presence Rate: ${pt.attendance_rate}%\n(${pt.present_count} of ${pt.total_count} marked present)`
                    );
                  }}
                  onMouseLeave={() => {
                    setHoveredNode(null);
                    handleMouseLeave();
                  }}
                />
              ))}

              {/* X Axis Dates */}
              {trendPoints.map((pt, idx) => (
                <text
                  key={idx}
                  x={pt.x}
                  y={svgHeight - 10}
                  className="chart-axis-text"
                  textAnchor="middle"
                >
                  {new Date(pt.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </text>
              ))}

              {/* Axis lines */}
              <line x1={padLeft} y1={padTop} x2={padLeft} y2={padTop + chartHeight} className="chart-axis-line" />
              <line x1={padLeft} y1={padTop + chartHeight} x2={svgWidth - padRight} y2={padTop + chartHeight} className="chart-axis-line" />
            </svg>

            {/* Custom Tooltip */}
            {tooltip.visible && (
              <div 
                className="chart-tooltip" 
                style={{ 
                  left: tooltip.x, 
                  top: tooltip.y,
                  opacity: 1
                }}
              >
                <span className="chart-tooltip-title">{tooltip.title}</span>
                {tooltip.content.split('\n').map((line, idx) => (
                  <span key={idx}>{line}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Today's Attendance Summary Donut Chart */}
        <div className="chart-card chart-container" style={{ margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3 className="chart-title" style={{ width: '100%', marginBottom: '16px' }}>
            <span>Today's Breakdown</span>
          </h3>

          <div style={{ position: 'relative', width: '160px', height: '160px' }}>
            <svg width="160" height="160" viewBox="0 0 160 160" className="chart-svg">
              {/* Background circle base */}
              <circle
                cx="80"
                cy="80"
                r={donutRadius}
                fill="none"
                stroke="var(--bg-primary)"
                strokeWidth="10"
              />

              {/* Segments */}
              {donutData.map((seg, idx) => (
                <circle
                  key={idx}
                  cx="80"
                  cy="80"
                  r={donutRadius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={hoveredSegment?.name === seg.name ? "14" : "10"}
                  strokeDasharray={`${seg.strokeLength} ${donutCircumference}`}
                  strokeDashoffset={-seg.offset}
                  transform="rotate(-90 80 80)"
                  className="donut-segment"
                  style={{
                    transition: 'stroke-width 0.15s ease, stroke 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    setHoveredSegment(seg);
                    handleMouseMove(
                      e,
                      seg.name,
                      `${seg.value} staff members (${seg.percentage.toFixed(1)}%)`
                    );
                  }}
                  onMouseMove={(e) => {
                    handleMouseMove(
                      e,
                      seg.name,
                      `${seg.value} staff members (${seg.percentage.toFixed(1)}%)`
                    );
                  }}
                  onMouseLeave={() => {
                    setHoveredSegment(null);
                    handleMouseLeave();
                  }}
                />
              ))}

              {/* Center Metrics Labels */}
              <text x="80" y="78" className="donut-center-text" style={{ fontSize: '20px', fill: 'var(--text-primary)' }}>
                {hoveredSegment ? hoveredSegment.value : `${stats?.attendance_rate_today || 0}%`}
              </text>
              <text x="80" y="96" className="donut-center-label" style={{ fontSize: '10px' }}>
                {hoveredSegment ? hoveredSegment.name : 'Present Today'}
              </text>
            </svg>

            {tooltip.visible && hoveredSegment && (
              <div 
                className="chart-tooltip" 
                style={{ 
                  left: tooltip.x, 
                  top: tooltip.y,
                  opacity: 1
                }}
              >
                <span className="chart-tooltip-title">{tooltip.title}</span>
                <span>{tooltip.content}</span>
              </div>
            )}
          </div>

          {/* Color Legend list */}
          <div className="legend-container" style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', marginTop: '20px' }}>
            {donutData.map((seg, idx) => (
              <div 
                key={idx} 
                className="legend-item" 
                style={{ 
                  fontSize: '11px',
                  opacity: hoveredSegment && hoveredSegment.name !== seg.name ? 0.5 : 1,
                  transition: 'opacity 0.2s ease',
                  fontWeight: hoveredSegment?.name === seg.name ? '600' : 'normal'
                }}
              >
                <span className="legend-color" style={{ backgroundColor: seg.color, width: '8px', height: '8px' }} />
                <span>{seg.name}: <strong style={{ color: 'var(--text-primary)' }}>{seg.value}</strong></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px', alignItems: 'start' }}>
        {/* Headcount by Department */}
        <div className="chart-card" style={{ margin: 0 }}>
          <h3 className="chart-title">
            <span>Headcount by Department</span>
            <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Active Status Only</span>
          </h3>
          <div className="distribution-list">
            {stats?.department_distribution?.map((dept, idx) => {
              const percentage = maxDeptCount > 0 ? (dept.count / maxDeptCount) * 100 : 0;
              return (
                <div className="distribution-row" key={idx}>
                  <div className="distribution-info">
                    <span style={{ fontWeight: '500' }}>{dept.department_name}</span>
                    <span style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>
                      {dept.count} {dept.count === 1 ? 'employee' : 'employees'} ({formatCurrency(dept.total_salary)})
                    </span>
                  </div>
                  <div className="distribution-bar-bg">
                    <div 
                      className="distribution-bar-fill" 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {(!stats?.department_distribution || stats.department_distribution.length === 0) && (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No active departments seeded.</p>
            )}
          </div>
        </div>

        {/* Recent Hires */}
        <div className="chart-card" style={{ padding: '24px', margin: 0 }}>
          <h3 className="chart-title" style={{ fontSize: '16px', marginBottom: '16px' }}>
            <span>Recent Hires</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {recentEmployees.map((emp) => (
              <div 
                key={emp.id} 
                className="employee-avatar-wrapper"
                style={{ 
                  cursor: 'pointer',
                  padding: '8px', 
                  borderRadius: 'var(--radius-sm)',
                  transition: 'background var(--transition-fast)'
                }}
                onClick={() => onViewEmployee(emp)}
                title="View details"
              >
                <div className="employee-avatar-circle" style={{ width: '36px', height: '36px', fontSize: '14px' }}>
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
            ))}
            {recentEmployees.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center' }}>No employees found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
