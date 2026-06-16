from sqlalchemy.orm import Session
from sqlalchemy import func
import models
import schemas
from datetime import date, timedelta

# --- Department CRUD ---

def get_departments(db: Session):
    return db.query(models.Department).all()

def get_department(db: Session, department_id: int):
    return db.query(models.Department).filter(models.Department.id == department_id).first()

def get_department_by_name(db: Session, name: str):
    return db.query(models.Department).filter(models.Department.name == name).first()

def create_department(db: Session, department: schemas.DepartmentCreate):
    db_dept = models.Department(
        name=department.name,
        description=department.description
    )
    db.add(db_dept)
    db.commit()
    db.refresh(db_dept)
    return db_dept

def delete_department(db: Session, department_id: int):
    db_dept = db.query(models.Department).filter(models.Department.id == department_id).first()
    if db_dept:
        db.delete(db_dept)
        db.commit()
        return True
    return False

# --- Employee CRUD ---

def get_employees(
    db: Session, 
    skip: int = 0, 
    limit: int = 100, 
    search: str = None, 
    department_id: int = None, 
    status: str = None
):
    query = db.query(models.Employee)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (models.Employee.first_name.ilike(search_term)) | 
            (models.Employee.last_name.ilike(search_term)) | 
            (models.Employee.email.ilike(search_term)) |
            (models.Employee.designation.ilike(search_term))
        )
        
    if department_id:
        query = query.filter(models.Employee.department_id == department_id)
        
    if status:
        query = query.filter(models.Employee.status == status)
        
    # Order by ID descending so recently added are first
    query = query.order_by(models.Employee.id.desc())
    
    total = query.count()
    items = query.offset(skip).limit(limit).all()
    return items, total

def get_employee(db: Session, employee_id: int):
    return db.query(models.Employee).filter(models.Employee.id == employee_id).first()

def get_employee_by_email(db: Session, email: str):
    return db.query(models.Employee).filter(models.Employee.email == email).first()

def create_employee(db: Session, employee: schemas.EmployeeCreate):
    db_employee = models.Employee(
        first_name=employee.first_name,
        last_name=employee.last_name,
        email=employee.email,
        phone=employee.phone,
        department_id=employee.department_id,
        designation=employee.designation,
        salary=employee.salary,
        date_of_joining=employee.date_of_joining,
        status=employee.status,
        avatar_url=employee.avatar_url
    )
    db.add(db_employee)
    db.commit()
    db.refresh(db_employee)
    return db_employee

def update_employee(db: Session, employee_id: int, employee_data: schemas.EmployeeUpdate):
    db_employee = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    if not db_employee:
        return None
    
    # Update only fields that are provided
    update_dict = employee_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(db_employee, key, value)
        
    db.commit()
    db.refresh(db_employee)
    return db_employee

def delete_employee(db: Session, employee_id: int):
    db_employee = db.query(models.Employee).filter(models.Employee.id == employee_id).first()
    if db_employee:
        db.delete(db_employee)
        db.commit()
        return True
    return False


# --- Dashboard Stats ---

def get_dashboard_stats(db: Session):
    total = db.query(models.Employee).count()
    active = db.query(models.Employee).filter(models.Employee.status == "Active").count()
    inactive = total - active
    
    # Average salary & total payroll
    salary_data = db.query(
        func.avg(models.Employee.salary),
        func.sum(models.Employee.salary)
    ).filter(models.Employee.status == "Active").first()
    
    avg_salary = salary_data[0] if salary_data[0] is not None else 0.0
    total_payroll = salary_data[1] if salary_data[1] is not None else 0.0
    
    # Department distribution
    dept_distribution = []
    
    # Query all departments
    all_depts = db.query(models.Department).all()
    for dept in all_depts:
        # Get count of active employees in department
        emp_stats = db.query(
            func.count(models.Employee.id),
            func.sum(models.Employee.salary)
        ).filter(
            models.Employee.department_id == dept.id,
            models.Employee.status == "Active"
        ).first()
        
        dept_distribution.append({
            "department_name": dept.name,
            "count": emp_stats[0] if emp_stats[0] is not None else 0,
            "total_salary": float(emp_stats[1]) if emp_stats[1] is not None else 0.0
        })

    # Today's attendance analytics
    today = date.today()
    active_count = db.query(models.Employee).filter(models.Employee.status == "Active").count()
    today_logs = db.query(models.Attendance).filter(models.Attendance.date == today).all()
    
    summary = {"Present": 0, "Absent": 0, "Late": 0, "On Leave": 0}
    present_or_late_count = 0
    for log in today_logs:
        if log.status in summary:
            summary[log.status] += 1
        if log.status in ["Present", "Late"]:
            present_or_late_count += 1
            
    # Count unmarked active employees as Absent
    logged_employee_ids = {log.employee_id for log in today_logs}
    for emp in db.query(models.Employee).filter(models.Employee.status == "Active").all():
        if emp.id not in logged_employee_ids:
            summary["Absent"] += 1
            
    attendance_rate_today = (present_or_late_count / active_count * 100) if active_count > 0 else 100.0

    # Calculate 7-day historic trend (including today)
    attendance_trend = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_logs = db.query(models.Attendance).filter(models.Attendance.date == day).all()
        
        day_present = sum(1 for log in day_logs if log.status in ["Present", "Late"])
        day_total = len(day_logs)
        
        if day_total == 0:
            day_rate = 100.0
            day_present = active_count
            day_total = active_count
        else:
            day_rate = (day_present / day_total * 100) if day_total > 0 else 100.0
            
        attendance_trend.append({
            "date": day,
            "present_count": day_present,
            "total_count": day_total,
            "attendance_rate": round(day_rate, 1)
        })
        
    return {
        "total_employees": total,
        "active_employees": active,
        "inactive_employees": inactive,
        "average_salary": float(avg_salary),
        "total_payroll": float(total_payroll),
        "department_distribution": dept_distribution,
        "attendance_rate_today": round(attendance_rate_today, 1),
        "attendance_summary_today": summary,
        "attendance_trend": attendance_trend
    }


# --- Attendance CRUD ---

def get_attendance(db: Session, date_val: date = None, employee_id: int = None):
    query = db.query(models.Attendance)
    if date_val:
        query = query.filter(models.Attendance.date == date_val)
    if employee_id:
        query = query.filter(models.Attendance.employee_id == employee_id)
    return query.all()

def log_attendance(db: Session, record: schemas.AttendanceCreate):
    db_record = db.query(models.Attendance).filter(
        models.Attendance.employee_id == record.employee_id,
        models.Attendance.date == record.date
    ).first()
    
    if db_record:
        db_record.status = record.status
        db_record.check_in = record.check_in
        db_record.check_out = record.check_out
    else:
        db_record = models.Attendance(
            employee_id=record.employee_id,
            date=record.date,
            status=record.status,
            check_in=record.check_in,
            check_out=record.check_out
        )
        db.add(db_record)
        
    db.commit()
    db.refresh(db_record)
    return db_record
