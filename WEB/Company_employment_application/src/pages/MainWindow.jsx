import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import '../styles/MainWindow.css';
import { Icon } from '@iconify/react';
import Sidebar from '../components/sidebar';
import { generateDepartmentPDF, generateFiringPDF } from '../components/pdfGenerator';

const API_BASE = 'http://127.0.0.1:8000';

function MainWindow() {
    const [allEmployees, setAllEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [positions, setPositions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDeptId, setSelectedDeptId] = useState(null);
    const [currentUser, setCurrentUser] = useState({ name: '', department: '', role: '', deptId: null });
    const [showFired, setShowFired] = useState(false);
    const [deptReportLoading, setDeptReportLoading] = useState(false);
    const [firingEmpId, setFiringEmpId] = useState(null);

    const [showFireModal, setShowFireModal] = useState(false);
    const [fireReason, setFireReason] = useState('');
    const [fireDate, setFireDate] = useState('');
    const [firingTarget, setFiringTarget] = useState(null);

    const navigate = useNavigate();
    const currentUserRole = localStorage.getItem("user_role");
    const currentUserId = localStorage.getItem("user_emp_id")
        ? parseInt(localStorage.getItem("user_emp_id"))
        : null;

    useEffect(() => {
        const fetchData = async () => {
            try {
                const headers = { 'X-User-Id': localStorage.getItem("acc_id") };
                const [empRes, deptRes, posRes] = await Promise.all([
                    fetch(`${API_BASE}/get_employees`, { headers }),
                    fetch(`${API_BASE}/get_departments`),
                    fetch(`${API_BASE}/get_positions`)
                ]);
                const employeesData = await empRes.json();
                const departmentsData = await deptRes.json();
                const positionsData = await posRes.json();

                setAllEmployees(employeesData);
                setDepartments(departmentsData);
                setPositions(positionsData);

                if (currentUserId) {
                    const myProfile = employeesData.find(emp => emp.emp_id === currentUserId);
                    if (myProfile) {
                        const deptName = departmentsData.find(d => d.dept_id === myProfile.dept_id)?.dept_name || '—';
                        setCurrentUser({
                            name: `${myProfile.emp_surname} ${myProfile.emp_name}`,
                            department: deptName,
                            role: currentUserRole == 'администратор' ? 'Администратор' :
                                currentUserRole == 'руководитель' ? 'Руководитель' : 'Сотрудник',
                            emp_photo: myProfile.emp_photo || null,
                            deptId: myProfile.dept_id
                        });
                    }
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [currentUserId, currentUserRole]);

    const handleDeptReport = async (deptId) => {
        if (!deptId) return;
        const includeFired = window.confirm('Включить уволенных сотрудников в отчёт?');
        setDeptReportLoading(true);
        try {
            const headers = { 'X-User-Id': localStorage.getItem('acc_id') };
            const response = await fetch(`${API_BASE}/reports/department/${deptId}?include_fired=${includeFired}`, { headers });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Ошибка получения отчёта');
            }
            const reportData = await response.json();
            generateDepartmentPDF(reportData);
        } catch (err) {
            console.error(err);
            alert('Не удалось сформировать отчёт: ' + err.message);
        } finally {
            setDeptReportLoading(false);
        }
    };

    const handleFireEmployee = (emp) => {
        setFiringTarget(emp);
        setFireReason('');
        setFireDate(new Date().toISOString().split('T')[0]);
        setShowFireModal(true);
    };

    const validateDate = (dateStr, hireDateStr) => {
        const date = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (isNaN(date.getTime())) return 'Неверная дата';
        if (date > today) return 'Дата увольнения не может быть в будущем';
        if (hireDateStr && date < new Date(hireDateStr)) return 'Дата увольнения не может быть раньше даты приёма';
        return null;
    };

    const confirmFire = async () => {
        if (!fireReason.trim()) {
            alert('Пожалуйста, укажите причину увольнения');
            return;
        }
        if (!fireDate) {
            alert('Пожалуйста, выберите дату увольнения');
            return;
        }

        const hireDate = firingTarget?.emp_hire_date;
        const dateError = validateDate(fireDate, hireDate);
        if (dateError) {
            alert(dateError);
            return;
        }

        setShowFireModal(false);
        setFiringEmpId(firingTarget.emp_id);

        try {
            const headers = {
                'Content-Type': 'application/json',
                'X-User-Id': localStorage.getItem('acc_id')
            };

            const res = await fetch(`${API_BASE}/change_employee/${firingTarget.emp_id}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({
                    emp_status: 'уволен',
                    emp_fired_date: fireDate,
                    fire_reason: fireReason
                })
            });
            if (!res.ok) throw new Error((await res.json()).detail);

            const dept = departments.find(d => d.dept_id == firingTarget.dept_id);
            const pos = positions.find(p => p.pos_id == firingTarget.pos_id);
            const empForPdf = {
                ...firingTarget,
                dept_name: dept?.dept_name || '—',
                pos_name: pos?.pos_name || '—'
            };
            await generateFiringPDF(empForPdf, fireReason, fireDate);

            try {
                await fetch(`${API_BASE}/send_firing_email`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ emp_id: firingTarget.emp_id, reason: fireReason })
                });
            } catch (emailErr) {
                console.warn('Email not sent:', emailErr);
            }

            const headersGet = { 'X-User-Id': localStorage.getItem('acc_id') };
            const empRes = await fetch(`${API_BASE}/get_employees`, { headers: headersGet });
            const employeesData = await empRes.json();
            setAllEmployees(employeesData);

            alert(`Сотрудник ${firingTarget.emp_surname} ${firingTarget.emp_name} уволен. PDF сформирован.`);
        } catch (err) {
            alert(err.message);
        } finally {
            setFiringEmpId(null);
            setFiringTarget(null);
        }
    };

    const activeEmployees = allEmployees.filter(emp => emp.emp_status != 'уволен');
    const firedEmployees = allEmployees.filter(emp => emp.emp_status == 'уволен');
    const displayedEmployees = showFired ? firedEmployees : activeEmployees;

    const filteredEmployees = selectedDeptId
        ? displayedEmployees.filter(emp => emp.dept_id == selectedDeptId)
        : displayedEmployees;

    const getDeptName = (deptId) => {
        const dept = departments.find(d => d.dept_id == deptId);
        return dept ? dept.dept_name : '—';
    };

    const canViewFull = (emp) => {
        if (currentUserRole == 'администратор' || currentUserRole == 'руководитель') return true;
        return currentUserId == emp.emp_id;
    };

    if (loading) return <div className="loading">Загрузка...</div>;

    return (
        <div className="main-window">
            <Header showBack={true} />
            <div className="main-layout">
                <Sidebar
                    departments={departments}
                    selectedDeptId={selectedDeptId}
                    onSelectDepartment={setSelectedDeptId}
                    currentUser={currentUser}
                />
                <main className="content">
                    <div style={{ textAlign: 'center', margin: '20px 0' }}>
                        {currentUserRole == 'администратор' && (
                            <>
                                <button className="toggle-fired-btn" onClick={() => setShowFired(!showFired)}>
                                    {showFired ? 'Активные сотрудники' : 'Уволенные сотрудники'}
                                </button>
                                <button className="admin-action-btn" onClick={() => navigate('/add-employee')}>
                                    Добавить нового сотрудника
                                </button>
                                <button className="admin-action-btn" onClick={() => navigate('/add-position')}>
                                    Добавить новую должность
                                </button>
                                {selectedDeptId && (
                                    <button className="admin-action-btn" onClick={() => handleDeptReport(selectedDeptId)} disabled={deptReportLoading}>
                                        {deptReportLoading ? 'Формирование...' : 'Отчёт по отделу (PDF)'}
                                    </button>
                                )}
                            </>
                        )}
                        {currentUserRole == 'руководитель' && selectedDeptId == currentUser.deptId && (
                            <button className="admin-action-btn" onClick={() => handleDeptReport(selectedDeptId)} disabled={deptReportLoading}>
                                {deptReportLoading ? 'Формирование...' : 'Отчёт по отделу (PDF)'}
                            </button>
                        )}
                    </div>

                    <div className="cards-container">
                        {filteredEmployees.map(emp => {
                            const fullView = canViewFull(emp) || showFired;
                            const isFiring = firingEmpId === emp.emp_id;
                            const showFireButton = currentUserRole === 'администратор' && emp.emp_status !== 'уволен';

                            return (
                                <div
                                    key={emp.emp_id}
                                    className="employee-card"
                                    onClick={() => navigate(`/employee/${emp.emp_id}`)}
                                >
                                    <div className="card-image-placeholder">
                                        {emp.emp_photo ? (
                                            <img
                                                src={`${API_BASE}/photos/${emp.emp_photo}`}
                                                alt="avatar"
                                                className="profile-picture-img"
                                            />
                                        ) : (
                                            <Icon icon="iconamoon:profile-circle-fill" width="90" height="90" />
                                        )}
                                    </div>

                                    <div className="card-details">
                                        <div className="card-name">
                                            {emp.emp_surname} {emp.emp_name} {emp.emp_patronym || ''}
                                        </div>
                                        {(fullView || emp.privacy_level != 'hidden') && (
                                            <div className="card-row">
                                                <span className="card-label">Email:</span>
                                                <span className="card-value">{emp.emp_mail}</span>
                                            </div>
                                        )}
                                        {(fullView || emp.privacy_level == 'open') && emp.emp_phone && (
                                            <div className="card-row">
                                                <span className="card-label">Телефон:</span>
                                                <span className="card-value">{emp.emp_phone}</span>
                                            </div>
                                        )}
                                        <div className="card-row">
                                            <span className="card-label">Статус:</span>
                                            <span className="card-value">{emp.emp_status}</span>
                                        </div>
                                        {showFired && (
                                            <div className="card-row">
                                                <span className="card-label">Отдел:</span>
                                                <span className="card-value">{getDeptName(emp.dept_id)}</span>
                                            </div>
                                        )}
                                    </div>

                                    {showFireButton && (
                                        <div className="card-fire-action">
                                            <button
                                                className="fire-card-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleFireEmployee(emp);
                                                }}
                                                disabled={isFiring}
                                            >
                                                <Icon icon="mdi:fire" width="20" height="20" style={{ marginRight: '6px' }} />
                                                Уволить
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </main>
            </div>

            {showFireModal && (
                <div className="modal-overlay" onClick={() => setShowFireModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h3>Увольнение сотрудника</h3>
                        <p>
                            {firingTarget?.emp_surname} {firingTarget?.emp_name}
                        </p>
                        <label>Дата увольнения:</label>
                        <input
                            type="date"
                            value={fireDate}
                            onChange={e => setFireDate(e.target.value)}
                            required
                            style={{
                                width: '100%',
                                padding: '8px',
                                marginBottom: '12px',
                                border: '1px solid #ccc',
                                borderRadius: '6px'
                            }}
                        />
                        <label>Причина увольнения:</label>
                        <textarea
                            rows="4"
                            value={fireReason}
                            onChange={e => setFireReason(e.target.value)}
                            placeholder="Опишите причину..."
                            autoFocus
                        />
                        <div className="modal-buttons">
                            <button className="modal-cancel" onClick={() => setShowFireModal(false)}>Отмена</button>
                            <button className="modal-confirm" onClick={confirmFire}>Уволить</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MainWindow;