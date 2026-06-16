from pydantic import BaseModel, EmailStr, Field
from datetime import date
from typing import Optional, List

# Department Schemas
class DepartmentBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentOut(DepartmentBase):
    id: int

    class Config:
        from_attributes = True


# Employee Schemas
class EmployeeBase(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    email: EmailStr
    phone: Optional[str] = None
    designation: str = Field(..., min_length=1, max_length=100)
    salary: float = Field(..., ge=0)
    date_of_joining: date
    status: str = Field(default="Active")  # "Active" or "Inactive"
    avatar_url: Optional[str] = None

class EmployeeCreate(EmployeeBase):
    department_id: int

class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    department_id: Optional[int] = None
    designation: Optional[str] = None
    salary: Optional[float] = None
    date_of_joining: Optional[date] = None
    status: Optional[str] = None
    avatar_url: Optional[str] = None

class EmployeeOut(EmployeeBase):
    id: int
    department_id: int
    department: Optional[DepartmentOut] = None

    class Config:
        from_attributes = True


# Attendance Schemas
class AttendanceBase(BaseModel):
    employee_id: int
    date: date
    status: str  # "Present", "Absent", "Late", "On Leave"
    check_in: Optional[str] = None
    check_out: Optional[str] = None

class AttendanceCreate(AttendanceBase):
    pass

class AttendanceUpdate(BaseModel):
    status: Optional[str] = None
    check_in: Optional[str] = None
    check_out: Optional[str] = None

class AttendanceOut(AttendanceBase):
    id: int
    employee: Optional[EmployeeOut] = None

    class Config:
        from_attributes = True

class AttendanceBulkCreate(BaseModel):
    date: date
    records: List[AttendanceCreate]


# Dashboard Schemas
class DepartmentStat(BaseModel):
    department_name: str
    count: int
    total_salary: float

class AttendanceTrendItem(BaseModel):
    date: date
    present_count: int
    total_count: int
    attendance_rate: float

class DashboardStats(BaseModel):
    total_employees: int
    active_employees: int
    inactive_employees: int
    average_salary: float
    total_payroll: float
    department_distribution: List[DepartmentStat]
    attendance_rate_today: float
    attendance_summary_today: dict  # e.g., {"Present": X, "Absent": Y, "Late": Z, "On Leave": W}
    attendance_trend: List[AttendanceTrendItem]
