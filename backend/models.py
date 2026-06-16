from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(String, nullable=True)

    # Relationship to employees
    employees = relationship("Employee", back_populates="department", cascade="all, delete-orphan")


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    designation = Column(String, nullable=False)
    salary = Column(Float, nullable=False)
    date_of_joining = Column(Date, nullable=False)
    status = Column(String, default="Active")  # "Active" or "Inactive"
    avatar_url = Column(String, nullable=True)

    # Relationship to department
    department = relationship("Department", back_populates="employees")
    # Relationship to attendance
    attendances = relationship("Attendance", back_populates="employee", cascade="all, delete-orphan")


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False, index=True)
    status = Column(String, nullable=False)  # "Present", "Absent", "Late", "On Leave"
    check_in = Column(String, nullable=True)  # "HH:MM"
    check_out = Column(String, nullable=True) # "HH:MM"

    # Relationship to employee
    employee = relationship("Employee", back_populates="attendances")
