from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, timedelta
import random

import database
import models
import schemas
import crud

# Initialize DB Tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(
    title="Employee Management System API",
    description="API to manage departments and employee directories",
    version="1.0.0"
)

# CORS Middleware configurations
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development simplicity
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Seed database on startup
@app.on_event("startup")
def seed_database():
    db = database.SessionLocal()
    try:
        # Check if departments exist
        existing_depts = db.query(models.Department).count()
        if existing_depts == 0:
            print("Seeding database with default departments and employees...")
            
            # Create default departments
            depts = [
                models.Department(name="Engineering", description="Software development and IT operations"),
                models.Department(name="Human Resources", description="Talent acquisition and employee relations"),
                models.Department(name="Sales", description="Account management and business growth"),
                models.Department(name="Marketing", description="Brand management and growth campaigns"),
                models.Department(name="Finance", description="Accounting, budget planning, and payroll"),
            ]
            for dept in depts:
                db.add(dept)
            db.commit()
            
        # Reload departments from DB to get their IDs
        db_depts = db.query(models.Department).all()
        dept_map = {dept.name: dept.id for dept in db_depts}
        
        # Check if employees exist
        existing_employees = db.query(models.Employee).count()
        if existing_employees == 0:
            employees = [
                models.Employee(
                    first_name="Alice",
                    last_name="Johnson",
                    email="alice.j@example.com",
                    phone="555-0101",
                    department_id=dept_map["Engineering"],
                    designation="Senior Frontend Engineer",
                    salary=95000,
                    date_of_joining=date.today() - timedelta(days=365),
                    status="Active"
                ),
                models.Employee(
                    first_name="Bob",
                    last_name="Smith",
                    email="bob.s@example.com",
                    phone="555-0102",
                    department_id=dept_map["Engineering"],
                    designation="Backend Tech Lead",
                    salary=120000,
                    date_of_joining=date.today() - timedelta(days=730),
                    status="Active"
                ),
                models.Employee(
                    first_name="Charlie",
                    last_name="Brown",
                    email="charlie.b@example.com",
                    phone="555-0103",
                    department_id=dept_map["Human Resources"],
                    designation="HR Manager",
                    salary=75000,
                    date_of_joining=date.today() - timedelta(days=180),
                    status="Active"
                ),
                models.Employee(
                    first_name="Diana",
                    last_name="Prince",
                    email="diana.p@example.com",
                    phone="555-0104",
                    department_id=dept_map["Sales"],
                    designation="Account Executive",
                    salary=80000,
                    date_of_joining=date.today() - timedelta(days=90),
                    status="Active"
                ),
                models.Employee(
                    first_name="Evan",
                    last_name="Wright",
                    email="evan.w@example.com",
                    phone="555-0105",
                    department_id=dept_map["Marketing"],
                    designation="Growth Specialist",
                    salary=70000,
                    date_of_joining=date.today() - timedelta(days=60),
                    status="Active"
                ),
                models.Employee(
                    first_name="Fiona",
                    last_name="Gallagher",
                    email="fiona.g@example.com",
                    phone="555-0106",
                    department_id=dept_map["Finance"],
                    designation="Financial Analyst",
                    salary=85000,
                    date_of_joining=date.today() - timedelta(days=240),
                    status="Active"
                ),
            ]
            for emp in employees:
                db.add(emp)
            db.commit()
            
        # Seed attendance data for the last 7 days for all employees if empty
        db_emps = db.query(models.Employee).filter(models.Employee.status == "Active").all()
        existing_attendance = db.query(models.Attendance).count()
        if existing_attendance == 0 and len(db_emps) > 0:
            print("Seeding database with default attendance logs...")
            for i in range(6, -1, -1):
                day = date.today() - timedelta(days=i)
                for emp in db_emps:
                    # Skip weekends for realistic logs
                    if day.weekday() >= 5:
                        continue
                        
                    rand = random.random()
                    if rand < 0.80:
                        status_val = "Present"
                        check_in = f"09:{random.randint(0, 15):02d}"
                        check_out = f"17:{random.randint(0, 30):02d}"
                    elif rand < 0.90:
                        status_val = "Late"
                        check_in = f"09:{random.randint(31, 59):02d}"
                        check_out = f"17:{random.randint(0, 15):02d}"
                    elif rand < 0.95:
                        status_val = "On Leave"
                        check_in = None
                        check_out = None
                    else:
                        status_val = "Absent"
                        check_in = None
                        check_out = None
                        
                    att = models.Attendance(
                        employee_id=emp.id,
                        date=day,
                        status=status_val,
                        check_in=check_in,
                        check_out=check_out
                    )
                    db.add(att)
            db.commit()
            print("Database seeding completed successfully.")
    except Exception as e:
        print(f"Error during seeding: {e}")
    finally:
        db.close()

# --- Health check ---
@app.get("/api/health", status_code=200)
def health_check():
    return {"status": "ok", "message": "Employee Management API is running"}

# --- Dashboard API ---
@app.get("/api/dashboard/stats", response_model=schemas.DashboardStats)
def get_dashboard_stats(db: Session = Depends(database.get_db)):
    return crud.get_dashboard_stats(db)

# --- Department APIs ---
@app.get("/api/departments", response_model=List[schemas.DepartmentOut])
def get_departments(db: Session = Depends(database.get_db)):
    return crud.get_departments(db)

@app.post("/api/departments", response_model=schemas.DepartmentOut)
def create_department(dept: schemas.DepartmentCreate, db: Session = Depends(database.get_db)):
    db_dept = crud.get_department_by_name(db, dept.name)
    if db_dept:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Department with name '{dept.name}' already exists."
        )
    return crud.create_department(db, dept)

@app.delete("/api/departments/{id}")
def delete_department(id: int, db: Session = Depends(database.get_db)):
    success = crud.delete_department(db, id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found or cannot be deleted."
        )
    return {"detail": "Department deleted successfully"}

# --- Employee APIs ---
@app.get("/api/employees")
def get_employees(
    db: Session = Depends(database.get_db),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1),
    search: Optional[str] = Query(default=None),
    department_id: Optional[int] = Query(default=None),
    status: Optional[str] = Query(default=None)
):
    skip = (page - 1) * limit
    items, total = crud.get_employees(
        db, skip=skip, limit=limit, search=search, department_id=department_id, status=status
    )
    
    # Map to schema output (SQLAlchemy handles lazy relation loading for department)
    employees_out = [schemas.EmployeeOut.from_orm(item) for item in items]
    
    return {
        "employees": employees_out,
        "total": total,
        "page": page,
        "limit": limit
    }

@app.get("/api/employees/{id}", response_model=schemas.EmployeeOut)
def get_employee(id: int, db: Session = Depends(database.get_db)):
    db_emp = crud.get_employee(db, id)
    if not db_emp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    return db_emp

@app.post("/api/employees", response_model=schemas.EmployeeOut, status_code=status.HTTP_201_CREATED)
def create_employee(employee: schemas.EmployeeCreate, db: Session = Depends(database.get_db)):
    # Validate department exists
    dept = crud.get_department(db, employee.department_id)
    if not dept:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Department ID {employee.department_id} does not exist."
        )
    
    # Validate email is unique
    existing_email = crud.get_employee_by_email(db, employee.email)
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Employee with email '{employee.email}' already exists."
        )
        
    return crud.create_employee(db, employee)

@app.put("/api/employees/{id}", response_model=schemas.EmployeeOut)
def update_employee(id: int, employee: schemas.EmployeeUpdate, db: Session = Depends(database.get_db)):
    # Validate department if updating
    if employee.department_id is not None:
        dept = crud.get_department(db, employee.department_id)
        if not dept:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Department ID {employee.department_id} does not exist."
            )
            
    # Validate email if updating and changing
    if employee.email is not None:
        existing_email = crud.get_employee_by_email(db, employee.email)
        if existing_email and existing_email.id != id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Employee with email '{employee.email}' already exists."
            )
            
    db_emp = crud.update_employee(db, id, employee)
    if not db_emp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    return db_emp

@app.delete("/api/employees/{id}")
def delete_employee(id: int, db: Session = Depends(database.get_db)):
    success = crud.delete_employee(db, id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    return {"detail": "Employee deleted successfully"}


# --- Attendance APIs ---

@app.get("/api/attendance", response_model=List[schemas.AttendanceOut])
def get_attendance(
    date_val: Optional[date] = Query(default=None, alias="date"),
    employee_id: Optional[int] = Query(default=None),
    db: Session = Depends(database.get_db)
):
    return crud.get_attendance(db, date_val=date_val, employee_id=employee_id)

@app.post("/api/attendance", response_model=schemas.AttendanceOut)
def log_attendance(record: schemas.AttendanceCreate, db: Session = Depends(database.get_db)):
    return crud.log_attendance(db, record)

@app.post("/api/attendance/bulk")
def log_attendance_bulk(payload: schemas.AttendanceBulkCreate, db: Session = Depends(database.get_db)):
    logged_records = []
    for record in payload.records:
        record.date = payload.date
        logged = crud.log_attendance(db, record)
        logged_records.append(logged)
    return {"detail": f"Successfully logged {len(logged_records)} attendance records", "count": len(logged_records)}

