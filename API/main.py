import os
from email.message import EmailMessage
import sqlalchemy
import smtplib
from fastapi import FastAPI, Depends, HTTPException, APIRouter, Header, UploadFile, File, Query, BackgroundTasks
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import create_engine, Column, Integer, String, Date, Enum, Float, ForeignKey, text
from sqlalchemy.orm import sessionmaker, declarative_base, Session, relationship
from pydantic import BaseModel
from typing import Optional, List
from datetime import date
import enum
from fastapi.middleware.cors import CORSMiddleware
import uuid


UPLOAD_DIR = "static/photos"
os.makedirs(UPLOAD_DIR, exist_ok=True)
Database_url = "mysql+pymysql://root:Mastersporta1@localhost:3306/office_db"
engine = create_engine(Database_url)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER", "your_email@gmail.com")
SMTP_PASS = os.getenv("SMTP_PASS", "your_app_password")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class emp_status(str, enum.Enum):
    работает = "работает"
    в_отпуске = "в_отпуске"
    удалёнка = "удалёнка"
    уволен = "уволен"

class UserRole(str, enum.Enum):
    администратор = "администратор"
    руководитель = "руководитель"
    сотрудник = "сотрудник"
    гость = "гость"

class Department(Base):
    __tablename__ = "departments"
    dept_id = Column(Integer, primary_key=True)
    dept_name = Column(String)
    dept_code = Column(String)
    dept_emp_id = Column(Integer, nullable=True)

class Position(Base):
    __tablename__ = "positions"
    pos_id = Column(Integer, primary_key=True)
    pos_name = Column(String)

class Employee(Base):
    __tablename__ = "employees"
    emp_id = Column(Integer, primary_key=True)
    emp_name = Column(String)
    emp_surname = Column(String)
    emp_patronym = Column(String, nullable=True)
    emp_mail = Column(String, unique=True)
    emp_phone = Column(String, nullable=True, unique=True)
    emp_hire_date = Column(Date)
    emp_status = Column(Enum(emp_status))
    dept_id = Column(Integer, ForeignKey("departments.dept_id"))
    pos_id = Column(Integer, ForeignKey("positions.pos_id"))
    emp_fired_date = Column(Date, nullable=True)
    emp_birthday = Column(Date, nullable=True)
    privacy_level = Column(Enum('open', 'restricted', 'hidden'), default='open', nullable=False)
    emp_photo = Column(String, nullable=True, default='default.png')
    dept = relationship("Department", backref="employees")
    pos = relationship("Position", backref="employees")
    fire_reason = Column(String, nullable=True)


class UserAccount(Base):
    __tablename__ = "user_accounts"
    acc_id = Column(Integer, primary_key=True)
    user_emp_id = Column(Integer, ForeignKey("employees.emp_id"), unique=True, nullable=True)
    user_login = Column(String, unique=True, nullable=False)
    user_password = Column(String, nullable=False)
    user_role = Column(Enum(UserRole), nullable=False, default=UserRole.сотрудник)

class emp_output(BaseModel):
    emp_id: int
    emp_name: str
    emp_surname: str
    emp_patronym: Optional[str] = None
    emp_mail: Optional[str] = None
    emp_phone: Optional[str] = None
    emp_hire_date: Optional[date] = None
    emp_status: Optional[str] = None
    dept_id: Optional[int] = None
    pos_id: Optional[int] = None
    emp_fired_date: Optional[date] = None
    emp_birthday: Optional[date] = None
    privacy_level: str
    emp_photo: Optional[str] = None
    class Config:
        from_attributes = True



class emp_create(BaseModel):
    emp_name: str
    emp_surname: str
    emp_patronym: Optional[str] = None
    emp_mail: str
    emp_phone: Optional[str] = None
    emp_hire_date: date
    emp_status: str
    dept_id: int
    pos_id: int
    emp_fired_date: Optional[date] = None
    emp_birthday:date
    user_login: str
    user_password: str
    user_role: str

class emp_update(BaseModel):
    emp_name: Optional[str] = None
    emp_surname: Optional[str] = None
    emp_patronym: Optional[str] = None
    emp_mail: Optional[str] = None
    emp_phone: Optional[str] = None
    emp_hire_date: Optional[date] = None
    emp_status: Optional[str] = None
    dept_id: Optional[int] = None
    pos_id: Optional[int] = None
    emp_fired_date: Optional[date] = None
    emp_birthday: Optional[date] = None
    fire_reason: Optional[str] = None

class dept_output(BaseModel):
    dept_id: int
    dept_name: str
    dept_code: str
    dept_emp_id: Optional[int] = None
    class Config:
        from_attributes = True

class dept_create(BaseModel):
    dept_name: str
    dept_code: str
    dept_emp_id: Optional[int] = None

class dept_update(BaseModel):
    dept_name: Optional[str] = None
    dept_code: Optional[str] = None
    dept_emp_id: Optional[int] = None

class pos_output(BaseModel):
    pos_id: int
    pos_name: str
    class Config:
        from_attributes = True

class pos_create(BaseModel):
    pos_name: str

class pos_update(BaseModel):
    pos_name: Optional[str] = None

class LoginRequest(BaseModel):
    login: str
    password: str

class LoginResponse(BaseModel):
    acc_id: int
    user_emp_id: Optional[int] = None
    user_login: str
    user_role: UserRole
    message: str = "Успешный вход"

class emp_guest_output(BaseModel):
    emp_id: int
    emp_name: str
    emp_surname: str
    emp_patronym: Optional[str] = None
    emp_phone: Optional[str] = None
    emp_mail: Optional[str] = None
    emp_photo: Optional[str] = None
    dept_id: Optional[int] = None
    pos_name: Optional[str] = None
    class Config:
        from_attributes = True

class EmployeeReportData(BaseModel):
    emp_id: int
    full_name: str
    emp_mail: Optional[str]
    emp_phone: Optional[str]
    emp_status: str
    dept_name: Optional[str]
    pos_name: Optional[str]
    emp_hire_date: Optional[date]
    emp_birthday: Optional[date]
    privacy_level: str

class DepartmentReportData(BaseModel):
    dept_id: int
    dept_name: str
    employees: List[EmployeeReportData]
    stats: dict

class PrivacyUpdate(BaseModel):
    privacy_level: str

class FireEmailRequest(BaseModel):
    emp_id: int
    reason: str

dept_router = APIRouter(tags=["Отделы"])
auth_router = APIRouter(tags=["Аутентификация"])
emp_router = APIRouter(tags=["Сотрудники"])
pos_router = APIRouter(tags=["Должности"])
search_router = APIRouter(tags=["Поиск"])
guest_router = APIRouter(tags=["Гость"])
rapport_router = APIRouter(tags=["Отчёты"])

def get_current_user(x_user_id: int = Header(...), db: Session = Depends(get_db)):
    user = db.query(UserAccount).filter(UserAccount.acc_id == x_user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid user")
    return user
def _build_report_employee(emp: Employee, viewer_role: UserRole, viewer_emp_id: int) -> EmployeeReportData:
    show_phone = True
    show_mail = True
    if viewer_role == UserRole.администратор:
        pass
    elif viewer_role == UserRole.руководитель:
        pass
    else:
        if viewer_emp_id != emp.emp_id:
            show_phone = False
            show_mail = False
        else:
            show_phone = True
            show_mail = True

    full_name = f"{emp.emp_surname} {emp.emp_name}"
    if emp.emp_patronym:
        full_name += f" {emp.emp_patronym}"

    dept_name = emp.dept.dept_name if emp.dept else None
    pos_name = emp.pos.pos_name if emp.pos else None

    return EmployeeReportData(
        emp_id=emp.emp_id,
        full_name=full_name,
        emp_mail=emp.emp_mail if show_mail else None,
        emp_phone=emp.emp_phone if show_phone else None,
        emp_status=emp.emp_status.value,
        dept_name=dept_name,
        pos_name=pos_name,
        emp_hire_date=emp.emp_hire_date,
        emp_birthday=emp.emp_birthday,
        privacy_level=emp.privacy_level
    )
def send_email_background(recipient: str, subject: str, body_html: str):
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = SMTP_USER
    msg["To"] = recipient
    msg.set_content(body_html, subtype="html")
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)
@dept_router.get("/get_departments", response_model=List[dept_output])
def get_departments(db: Session = Depends(get_db)):
    depts = db.query(Department).all()
    return depts

@dept_router.post("/create_departments", response_model=dept_output)
def create_departments(dep: dept_create, db: Session = Depends(get_db)):
    existing_dept = db.query(Department).filter(Department.dept_name == dep.dept_name).first()
    if existing_dept:
        raise HTTPException(status_code=400, detail="отдел с таким названием уже существует")
    existing_code = db.query(Department).filter(Department.dept_code == dep.dept_code).first()
    if existing_code:
        raise HTTPException(status_code=400, detail="отдел с таким кодом уже существует")
    db_dep = Department(**dep.model_dump())
    db.add(db_dep)
    db.commit()
    db.refresh(db_dep)
    return db_dep

@dept_router.delete("/delete_departments/{dept_id}")
def delete_department(dept_id: int, db: Session = Depends(get_db)):
    db_dep = db.query(Department).filter(Department.dept_id == dept_id).first()
    if not db_dep:
        raise HTTPException(status_code=404, detail="Отдел не найден")
    try:
        db.delete(db_dep)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="в этом отделе есть сотрудники и удалить пока они есть нелзья !")
    return {"message": "Отдел удалён"}


@auth_router.post("/Login", response_model=LoginResponse)
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(UserAccount).filter(UserAccount.user_login == credentials.login).first()
    if not user:
        raise HTTPException(status_code=401, detail="Неверный логин или пароль")
    if user.user_password != credentials.password:
        raise HTTPException(status_code=401, detail="Неверный пароль")

    if user.user_emp_id:
        emp = db.query(Employee).filter(Employee.emp_id == user.user_emp_id).first()
        if emp and emp.emp_status == emp_status.уволен:
            raise HTTPException(status_code=403, detail="Ваша учётная запись деактивирована (увольнение).")

    return LoginResponse(
        acc_id=user.acc_id,
        user_emp_id=user.user_emp_id,
        user_login=user.user_login,
        user_role=user.user_role,
        message=f"Добро пожаловать, роль: {user.user_role.value}"
    )


@emp_router.get("/get_employees", response_model=List[emp_output])
def get_employees(current_user: UserAccount = Depends(get_current_user), db: Session = Depends(get_db)):
    all_emps = db.query(Employee).all()
    result = []
    viewer_emp_id = current_user.user_emp_id
    viewer_role = current_user.user_role

    for emp in all_emps:
        if viewer_role in [UserRole.администратор, UserRole.руководитель]:
            result.append(emp)
            continue

        if viewer_emp_id and emp.emp_id == viewer_emp_id:
            result.append(emp)
            continue


        if emp.privacy_level == 'restricted':
            emp.emp_phone = None
        elif emp.privacy_level == 'hidden':
            emp.emp_phone = None
            emp.emp_mail = None

        result.append(emp)

    return result
@emp_router.put("/employees/{emp_id}/photo")
async def upload_photo(
    emp_id: int,
    file: UploadFile = File(...),
    current_user: UserAccount = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    emp = db.query(Employee).filter(Employee.emp_id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    if current_user.user_role != UserRole.администратор and (not current_user.user_emp_id or current_user.user_emp_id != emp_id):
        raise HTTPException(status_code=403, detail="Not allowed")

    if file.content_type not in ["image/jpeg", "image/png", "image/gif"]:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, GIF allowed")

    ext = os.path.splitext(file.filename)[1] if file.filename else ".png"
    filename = f"{emp_id}_{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    emp.emp_photo = filename
    db.commit()

    return {"message": "Photo uploaded", "filename": filename}

@emp_router.get("/employees/{emp_id}/photo")
def get_photo(emp_id: int, db: Session = Depends(get_db)):
    emp = db.query(Employee).filter(Employee.emp_id == emp_id).first()

    filename = emp.emp_photo

    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.isfile(file_path):
        file_path = os.path.join(UPLOAD_DIR, "default.png")

    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="Photo not found")

    return FileResponse(file_path, media_type="image/png")   #

@emp_router.put("/employees/{emp_id}/privacy", response_model=dict)
def update_privacy(emp_id: int, update: PrivacyUpdate, current_user: UserAccount = Depends(get_current_user), db: Session = Depends(get_db)):
    emp = db.query(Employee).filter(Employee.emp_id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    if current_user.user_role != UserRole.администратор and (not current_user.user_emp_id or current_user.user_emp_id != emp_id):
        raise HTTPException(status_code=403, detail="Not allowed to change privacy of this employee")
    if update.privacy_level not in ['open', 'restricted', 'hidden']:
        raise HTTPException(status_code=400, detail="Invalid privacy level")
    emp.privacy_level = update.privacy_level
    db.commit()
    return {"message": "Privacy updated", "privacy_level": emp.privacy_level}

@emp_router.post("/create_employee", response_model=emp_output)
def create_employee(emp: emp_create, db: Session = Depends(get_db)):
    existing_email = db.query(Employee).filter(Employee.emp_mail == emp.emp_mail).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Сотрудник с таким email уже существует")
    if emp.emp_phone:
        existing_phone = db.query(Employee).filter(Employee.emp_phone == emp.emp_phone).first()
        if existing_phone:
            raise HTTPException(status_code=400, detail="Сотрудник с таким телефоном уже существует")
    existing_login = db.query(UserAccount).filter(UserAccount.user_login == emp.user_login).first()
    if existing_login:
        raise HTTPException(status_code=400, detail="Пользователь с таким логином уже существует")
    dept = db.query(Department).filter(Department.dept_id == emp.dept_id).first()
    if not dept:
        raise HTTPException(status_code=400, detail=f"Отдел с id={emp.dept_id} не существует")
    pos = db.query(Position).filter(Position.pos_id == emp.pos_id).first()
    if not pos:
        raise HTTPException(status_code=400, detail=f"Должность с id={emp.pos_id} не существует")
    try:
        status_enum = emp_status(emp.emp_status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Неверный статус: {emp.emp_status}. Допустимые: {[e.value for e in emp_status]}")
    try:
        role_enum = UserRole(emp.user_role)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Неверная роль: {emp.user_role}. Допустимые: {[e.value for e in UserRole]}")
    db_emp = Employee(
        emp_name=emp.emp_name,
        emp_surname=emp.emp_surname,
        emp_patronym=emp.emp_patronym,
        emp_mail=emp.emp_mail,
        emp_phone=emp.emp_phone,
        emp_hire_date=emp.emp_hire_date,
        emp_status=status_enum,
        dept_id=emp.dept_id,
        pos_id=emp.pos_id,
        emp_fired_date=emp.emp_fired_date,
        emp_birthday = emp.emp_birthday
    )
    db.add(db_emp)
    db.flush()
    db_account = UserAccount(
        user_emp_id=db_emp.emp_id,
        user_login=emp.user_login,
        user_password=emp.user_password,
        user_role=role_enum
    )
    db.add(db_account)
    db.commit()
    db.refresh(db_emp)
    return db_emp

@emp_router.delete("/delete_employee/{emp_id}")
def delete_employee(emp_id: int, db: Session = Depends(get_db)):
    emp = db.query(Employee).filter(Employee.emp_id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="cотрудник не найден")
    db.execute(text("SET FOREIGN_KEY_CHECKS=0"))
    try:
        account = db.query(UserAccount).filter(UserAccount.user_emp_id == emp_id).first()
        if account:
            db.delete(account)
            db.flush()
        db.delete(emp)
        db.flush()
        db.execute(text("SET FOREIGN_KEY_CHECKS=1"))
        db.commit()
        return {"message": "cотрудник удалён"}
    except Exception as e:
        db.execute(text("SET FOREIGN_KEY_CHECKS=1"))
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Ошибка при удалении: {str(e)}")

@emp_router.put("/change_employee/{emp_id}", response_model=emp_output)
def change_employee(emp_id: int, emp_data: emp_update, db: Session = Depends(get_db)):
    emp = db.query(Employee).filter(Employee.emp_id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="сотрудник не найден")

    if emp_data.emp_mail is not None and emp_data.emp_mail != emp.emp_mail:
        existing_email = db.query(Employee).filter(
            Employee.emp_mail == emp_data.emp_mail,
            Employee.emp_id != emp_id
        ).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="Сотрудник с таким email уже существует")

    if emp_data.emp_phone is not None and emp_data.emp_phone != emp.emp_phone:
        existing_phone = db.query(Employee).filter(
            Employee.emp_phone == emp_data.emp_phone,
            Employee.emp_id != emp_id
        ).first()
        if existing_phone:
            raise HTTPException(status_code=400, detail="Сотрудник с таким телефоном уже существует")

    if emp_data.dept_id is not None:
        dept = db.query(Department).filter(Department.dept_id == emp_data.dept_id).first()
        if not dept:
            raise HTTPException(status_code=400, detail=f"Отдел с id={emp_data.dept_id} не существует")

    if emp_data.pos_id is not None:
        pos = db.query(Position).filter(Position.pos_id == emp_data.pos_id).first()
        if not pos:
            raise HTTPException(status_code=400, detail=f"Должность с id={emp_data.pos_id} не существует")

    update_dict = emp_data.model_dump(exclude_unset=True)


    if 'fire_reason' in update_dict and update_dict['fire_reason']:
        emp.fire_reason = update_dict['fire_reason']

    if 'emp_status' in update_dict and update_dict['emp_status'] is not None:
        try:
            update_dict['emp_status'] = emp_status(update_dict['emp_status'])
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Неверный статус: {update_dict['emp_status']}")

    for key, value in update_dict.items():
        if key != 'fire_reason':
            setattr(emp, key, value)

    db.commit()
    db.refresh(emp)
    return emp

@pos_router.get("/get_positions", response_model=List[pos_output])
def get_positions(db: Session = Depends(get_db)):
    return db.query(Position).all()

@pos_router.post("/create_position", response_model=pos_output)
def create_position(pos: pos_create, db: Session = Depends(get_db)):
    existing_pos = db.query(Position).filter(Position.pos_name == pos.pos_name).first()
    if existing_pos:
        raise HTTPException(status_code=400, detail="Должность с таким названием уже существует")
    db_pos = Position(pos_name=pos.pos_name)
    db.add(db_pos)
    db.commit()
    db.refresh(db_pos)
    return db_pos

@pos_router.delete("/delete_position/{pos_id}")
def delete_position(pos_id: int, db: Session = Depends(get_db)):
    db_pos = db.query(Position).filter(Position.pos_id == pos_id).first()
    if not db_pos:
        raise HTTPException(status_code=404, detail="Должность не найдена")
    try:
        db.delete(db_pos)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="Нельзя Удвлить должность Посталенуюю сотрудникам")
    return {"message": "удалён должность"}

@pos_router.put("/change_positions/{pos_id}", response_model=pos_output)
def change_position(pos_id: int, poss: pos_update, db: Session = Depends(get_db)):
    pos = db.query(Position).filter(Position.pos_id == pos_id).first()
    if not pos:
        raise HTTPException(status_code=404, detail="должность не найдена")
    if poss.pos_name is not None:
        existing_pos = db.query(Position).filter(
            Position.pos_name == poss.pos_name,
            Position.pos_id != pos_id
        ).first()
        if existing_pos:
            raise HTTPException(status_code=400, detail="Должность с таким названием уже существует")
        pos.pos_name = poss.pos_name
    db.commit()
    db.refresh(pos)
    return pos

@search_router.get("/employees/search", response_model=List[emp_output])
def search_employees_by_dept(dept_id: int, db: Session = Depends(get_db)):
    emps = db.query(Employee).filter(Employee.dept_id == dept_id).all()
    if not emps:
        raise HTTPException(status_code=404, detail="сотрудники не найдены")
    return emps

@guest_router.get("/guest/departments", response_model=List[dept_output])
def guest_departments(db: Session = Depends(get_db)):
    return db.query(Department).all()

@guest_router.get("/guest/employees", response_model=List[emp_guest_output])
def guest_employees(db: Session = Depends(get_db)):
    all_emps = db.query(Employee).all()
    result = []
    for emp in all_emps:
        pos_name = None
        if emp.pos_id:
            pos = db.query(Position).filter(Position.pos_id == emp.pos_id).first()
            pos_name = pos.pos_name if pos else None

        if emp.privacy_level == 'hidden':
            result.append({
                "emp_id": emp.emp_id,
                "emp_name": emp.emp_name,
                "emp_surname": emp.emp_surname,
                "emp_patronym": emp.emp_patronym,
                "emp_mail": None,
                "emp_phone": None,
                "emp_photo": emp.emp_photo,
                "pos_name": None,
                "dept_id": emp.dept_id
            })
        else:
            result.append({
                "emp_id": emp.emp_id,
                "emp_name": emp.emp_name,
                "emp_surname": emp.emp_surname,
                "emp_patronym": emp.emp_patronym,
                "emp_mail": emp.emp_mail,
                "emp_phone": None,
                "emp_photo": emp.emp_photo,
                "pos_name": pos_name,
                "dept_id": emp.dept_id
            })
    return result
@rapport_router.get("/employee/{emp_id}", response_model=EmployeeReportData)
def get_employee_report(
    emp_id: int,
    current_user: UserAccount = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    if current_user.user_role not in [UserRole.администратор, UserRole.руководитель]:
        if current_user.user_emp_id != emp_id: raise HTTPException(403, "Доступ запрещён")

    emp = db.query(Employee).filter(Employee.emp_id == emp_id).first()
    if not emp:
        raise HTTPException(404, "Сотрудник не найден")

    if current_user.user_role == UserRole.руководитель:
        manager_emp = db.query(Employee).filter(Employee.emp_id == current_user.user_emp_id).first()
        if not manager_emp:
            raise HTTPException(403, "Ваш профиль сотрудника не найден")
        if manager_emp.dept_id != emp.dept_id:
            raise HTTPException(403, "Вы можете формировать отчёты только по сотрудникам вашего отдела")

    return _build_report_employee(emp, current_user.user_role, current_user.user_emp_id)

@rapport_router.get("/department/{dept_id}", response_model=DepartmentReportData)
def get_department_report(
    dept_id: int,
    include_fired: bool = Query(False, description="Включить уволенных сотрудников"),
    current_user: UserAccount = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    if current_user.user_role == UserRole.администратор:
        pass
    elif current_user.user_role == UserRole.руководитель:
        manager_emp = db.query(Employee).filter(Employee.emp_id == current_user.user_emp_id).first()
        if not manager_emp or manager_emp.dept_id != dept_id:
            raise HTTPException(403, "Вы можете формировать отчёты только по вашему отделу")
    else:
        raise HTTPException(403, "Доступ запрещён")

    dept = db.query(Department).filter(Department.dept_id == dept_id).first()
    if not dept:
        raise HTTPException(404, "Отдел не найден")

    query = db.query(Employee).filter(Employee.dept_id == dept_id)
    if not include_fired:
        query = query.filter(Employee.emp_status != emp_status.уволен)

    employees = query.all()

    report_employees = []
    stats = {"работает": 0, "в_отпуске": 0, "удалёнка": 0, "уволен": 0, "total": len(employees)}
    for emp in employees:

        show_phone = True
        show_mail = True
        if emp.privacy_level == 'restricted':
            show_phone = False
        elif emp.privacy_level == 'hidden':
            show_phone = False
            show_mail = False

        if current_user.user_role in [UserRole.администратор, UserRole.руководитель]:
            show_phone = True
            show_mail = True

        full_name = f"{emp.emp_surname} {emp.emp_name}"
        if emp.emp_patronym:
            full_name += f" {emp.emp_patronym}"

        dept_name = dept.dept_name
        pos_name = emp.pos.pos_name if emp.pos else None

        report_employees.append(EmployeeReportData(
            emp_id=emp.emp_id,
            full_name=full_name,
            emp_mail=emp.emp_mail if show_mail else None,
            emp_phone=emp.emp_phone if show_phone else None,
            emp_status=emp.emp_status.value,
            dept_name=dept_name,
            pos_name=pos_name,
            emp_hire_date=emp.emp_hire_date,
            emp_birthday=emp.emp_birthday,
            privacy_level=emp.privacy_level
        ))
        if emp.emp_status == emp_status.работает:
            stats["работает"] += 1
        elif emp.emp_status == emp_status.в_отпуске:
            stats["в_отпуске"] += 1
        elif emp.emp_status == emp_status.удалёнка:
            stats["удалёнка"] += 1
        elif emp.emp_status == emp_status.уволен:
            stats["уволен"] += 1

    return DepartmentReportData(
        dept_id=dept.dept_id,
        dept_name=dept.dept_name,
        employees=report_employees,
        stats=stats
    )

api = FastAPI(title="ООО'Company'")

@api.get("/")
def home():
    return "we have connection"


@api.post("/send_firing_email")
def send_firing_email(request: FireEmailRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    emp = db.query(Employee).filter(Employee.emp_id == request.emp_id).first()
    if not emp:
        raise HTTPException(404, "Сотрудник не найден")

    html_content = f"""
    <html>
    <body>
        <h2>Уведомление об увольнении</h2>
        <p>Уважаемый(ая) {emp.emp_surname} {emp.emp_name},</p>
        <p>Ваша трудовая деятельность в компании прекращена.</p>
        <p><strong>Причина:</strong> {request.reason}</p>
        <p>Дата увольнения: {date.today().isoformat()}</p>
        <p>Подробности в приложенном PDF‑файле.</p>
    </body>
    </html>
    """
    background_tasks.add_task(send_email_background, emp.emp_mail, "Уведомление об увольнении", html_content)
    return {"message": "Email отправлен в фоновом режиме"}
api.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
api.mount("/photos", StaticFiles(directory="static/photos"), name="photos")
api.include_router(dept_router)
api.include_router(auth_router)
api.include_router(emp_router)
api.include_router(pos_router)
api.include_router(search_router)
api.include_router(guest_router)
api.include_router(rapport_router, prefix="/reports")