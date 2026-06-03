import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { Icon } from '@iconify/react';
import '../styles/UserProfile.css';
import { generateEmployeePDF } from '../components/pdfGenerator';

const API_BASE = 'http://127.0.0.1:8000';

function UserProfile() {
    const { empId } = useParams();
    const navigate = useNavigate();
    const [employee, setEmployee] = useState(null);
    const [departments, setDepartments] = useState([]);
    const [positions, setPositions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [editMode, setEditMode] = useState(false);
    const [editData, setEditData] = useState({});
    const [saving, setSaving] = useState(false);
    const [reportLoading, setReportLoading] = useState(false);

    const currentUserRole = localStorage.getItem('user_role');
    const currentUserId = localStorage.getItem('user_emp_id')
        ? parseInt(localStorage.getItem('user_emp_id'))
        : null;

    useEffect(() => {
        let cancelled = false;

        const fetchEmployee = async () => {
            setLoading(true);
            setError('');
            try {
                const headers = { 'X-User-Id': localStorage.getItem('acc_id') };
                const [empRes, deptRes, posRes] = await Promise.all([
                    fetch(`${API_BASE}/get_employees`, { headers }),
                    fetch(`${API_BASE}/get_departments`),
                    fetch(`${API_BASE}/get_positions`)
                ]);
                const employees = await empRes.json();
                const depts = await deptRes.json();
                const positions = await posRes.json();

                if (cancelled) return;

                const emp = employees.find(e => e.emp_id == parseInt(empId));
                if (!emp) {
                    setError('Сотрудник не найден');
                    setLoading(false);
                    return;
                }

                setEmployee(emp);
                setDepartments(depts);
                setPositions(positions);

                setEditData({
                    emp_name: emp.emp_name || '',
                    emp_surname: emp.emp_surname || '',
                    emp_patronym: emp.emp_patronym || '',
                    emp_mail: emp.emp_mail || '',
                    emp_phone: emp.emp_phone || '',
                    emp_status: emp.emp_status || '',
                    privacy_level: emp.privacy_level || 'open',
                    dept_id: emp.dept_id || '',
                    pos_id: emp.pos_id || '',
                    emp_hire_date: emp.emp_hire_date || '',
                    emp_birthday: emp.emp_birthday || '',
                });
            } catch (err) {
                if (!cancelled) {
                    console.error(err);
                    setError('Ошибка загрузки данных');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchEmployee();
        return () => { cancelled = true; };
    }, [empId]);

    //=== PDF генерация ===
    const handlePrintEmployee = async () => {
        if (!employee) return;
        setReportLoading(true);
        try {
            const headers = { 'X-User-Id': localStorage.getItem('acc_id') };
            const response = await fetch(`${API_BASE}/reports/employee/${empId}`, { headers });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Ошибка загрузки данных для отчёта');
            }
            const reportData = await response.json();
            generateEmployeePDF(reportData);
        } catch (err) {
            setError(err.message);
        } finally {
            setReportLoading(false);
        }
    };

    const getDeptName = (id) => departments.find(d => d.dept_id == id)?.dept_name || '—';
    const getPosName = (id) => positions.find(p => p.pos_id == id)?.pos_name || '—';

    const canViewFull = () => {
        if (currentUserRole == 'администратор' || currentUserRole == 'руководитель') return true;
        return currentUserId == employee?.emp_id;
    };

    const canEdit = () => currentUserRole == 'администратор' || currentUserRole == 'руководитель';
    const canFire = () => currentUserRole == 'администратор';

    const handleEditChange = (e) => {
        setEditData({ ...editData, [e.target.name]: e.target.value });
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');
        if (editData.emp_phone && editData.emp_phone.trim() != '') {
            const phoneClean = editData.emp_phone.trim();
            const validPhoneRegex = /^\+?[\d\s\-()]{7,}$/;
            const digitsOnly = phoneClean.replace(/\D/g, '');
            if (!validPhoneRegex.test(phoneClean)) {
                setError('Телефон содержит недопустимые символы. Используйте цифры, пробелы, скобки и дефис.');
                setSaving(false);
                return;
            }
            if (digitsOnly.length < 10 || digitsOnly.length > 11) {
                setError('Телефон должен содержать от 10 до 11 цифр.');
                setSaving(false);
                return;
            }
        }

        if (editData.emp_hire_date && editData.emp_birthday) {
            const hireDate = new Date(editData.emp_hire_date);
            const birthDate = new Date(editData.emp_birthday);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const eighteenthBirthday = new Date(
                birthDate.getFullYear() + 18,
                birthDate.getMonth(),
                birthDate.getDate()
            );

            if (hireDate < birthDate) {
                setError('Дата приёма не может быть раньше даты рождения');
                setSaving(false);
                return;
            }
            if (hireDate >= today) {
                setError('Дата приёма не может быть сегодня или в будущем');
                setSaving(false);
                return;
            }
            if (birthDate >= today) {
                setError('Дата рождения не может быть сегодня или в будущем');
                setSaving(false);
                return;
            }
            if (hireDate < eighteenthBirthday) {
                setError('Сотрудник был нанят до достижения 18 лет');
                setSaving(false);
                return;
            }
        }
        try {
            const headers = {
                'Content-Type': 'application/json',
                'X-User-Id': localStorage.getItem('acc_id')
            };
            const payload = {
                emp_name: editData.emp_name,
                emp_surname: editData.emp_surname,
                emp_patronym: editData.emp_patronym || null,
                emp_mail: editData.emp_mail,
                emp_phone: editData.emp_phone || null,
                emp_status: editData.emp_status,
                dept_id: editData.dept_id ? parseInt(editData.dept_id) : null,
                pos_id: editData.pos_id ? parseInt(editData.pos_id) : null,
                emp_hire_date: editData.emp_hire_date || null,
                emp_birthday: editData.emp_birthday || null
            };

            const res1 = await fetch(`${API_BASE}/change_employee/${empId}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(payload)
            });
            if (!res1.ok) throw new Error((await res1.json()).detail);

            if (editData.privacy_level != employee.privacy_level) {
                const res2 = await fetch(`${API_BASE}/employees/${empId}/privacy`, {
                    method: 'PUT',
                    headers,
                    body: JSON.stringify({ privacy_level: editData.privacy_level })
                });
                if (!res2.ok) throw new Error((await res2.json()).detail);
            }

            const empRes = await fetch(`${API_BASE}/get_employees`, { headers });
            const employees = await empRes.json();
            const updated = employees.find(e => e.emp_id == parseInt(empId));
            if (updated) {
                setEmployee(updated);
                setEditData({
                    emp_name: updated.emp_name || '',
                    emp_surname: updated.emp_surname || '',
                    emp_patronym: updated.emp_patronym || '',
                    emp_mail: updated.emp_mail || '',
                    emp_phone: updated.emp_phone || '',
                    emp_status: updated.emp_status || '',
                    privacy_level: updated.privacy_level || 'open',
                    dept_id: updated.dept_id || '',
                    pos_id: updated.pos_id || '',
                    emp_hire_date: updated.emp_hire_date || '',
                    emp_birthday: updated.emp_birthday || '',
                });
            }
            setEditMode(false);
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleFire = async () => {
        if (!window.confirm('Уволить сотрудника?')) return;
        try {
            const headers = {
                'Content-Type': 'application/json',
                'X-User-Id': localStorage.getItem('acc_id')
            };
            const today = new Date().toISOString().split('T')[0];
            const res = await fetch(`${API_BASE}/change_employee/${empId}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ emp_status: 'уволен', emp_fired_date: today })
            });
            if (!res.ok) throw new Error((await res.json()).detail);
            navigate('/main', { replace: true });
        } catch (err) {
            alert(err.message);
        }
    };

    if (loading) return <div className="loading">Загрузка...</div>;
    if (error && !employee) return <div className="error">{error}</div>;

    return (
        <div className="user-profile-page">
            <Header showBack={true} />
            <div className="profile-container">
                {employee && !editMode && (
                    <div className="profile-view">
                        <button className="back-link" onClick={() => navigate(-1)}>{'<'} Назад</button>
                        <div className="profile-header">
                            <div className="profile-avatar">
                                {employee.emp_photo ? (
                                    <img src={`${API_BASE}/photos/${employee.emp_photo}`} alt="avatar" className="avatar-img" />
                                ) : (
                                    <Icon icon="iconamoon:profile-circle-fill" width="120" height="120" />
                                )}
                            </div>
                            <h2>{employee.emp_surname} {employee.emp_name} {employee.emp_patronym || ''}</h2>
                        </div>

                        <div className="profile-details">
                            <div className="detail-row">
                                <span className="detail-label">Email:</span>
                                <span className='detail-row-info' >{canViewFull() || employee.privacy_level !== 'hidden' ? employee.emp_mail || '—' : '—'}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Телефон:</span>
                                <span className='detail-row-info' >{(canViewFull() || employee.privacy_level === 'open') ? employee.emp_phone || '—' : '—'}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Статус:</span>
                                <span className='detail-row-info' >{employee.emp_status}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Отдел:</span>
                                <span className='detail-row-info' >{getDeptName(employee.dept_id)}</span>
                            </div>
                            {canViewFull() && (
                                <>
                                    <div className="detail-row">
                                        <span className="detail-label">Должность:</span>
                                        <span className='detail-row-info' >{getPosName(employee.pos_id)}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="detail-label">Дата приёма:</span>
                                        <span className='detail-row-info' >{employee.emp_hire_date || '—'}</span>
                                    </div>
                                    {employee.emp_fired_date && (
                                        <div className="detail-row">
                                            <span className="detail-label">Дата увольнения:</span>
                                            <span className='detail-row-info' >{employee.emp_fired_date}</span>
                                        </div>
                                    )}
                                    {employee.emp_birthday && (
                                        <div className="detail-row">
                                            <span className="detail-label">День рождения:</span>
                                            <span className='detail-row-info' >{employee.emp_birthday}</span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="profile-actions">
                            {canEdit() && employee.emp_status != 'уволен' && (
                                <button className="edit-btn" onClick={() => setEditMode(true)}>Редактировать</button>
                            )}
                            {canFire() && employee.emp_status != 'уволен' && (
                                <button className="fire-btn" onClick={handleFire}>Уволить</button>
                            )}
                            {(currentUserRole == 'администратор' || currentUserRole == 'руководитель' || currentUserId == employee?.emp_id) && (
                                <button className="print-btn" onClick={handlePrintEmployee} disabled={reportLoading}>
                                    {reportLoading ? 'Загрузка...' : 'Скачать PDF'}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {editMode && (
                    <div className="profile-edit">
                        <h3>Редактирование профиля</h3>
                        {error && <div className="error">{error}</div>}
                        <div className="form-group-profile">
                            <label>Имя</label>
                            <input name="emp_name" value={editData.emp_name} onChange={handleEditChange} />
                        </div>
                        <div className="form-group-profile">
                            <label>Фамилия</label>
                            <input name="emp_surname" value={editData.emp_surname} onChange={handleEditChange} />
                        </div>
                        <div className="form-group-profile">
                            <label>Отчество</label>
                            <input name="emp_patronym" value={editData.emp_patronym} onChange={handleEditChange} />
                        </div>
                        <div className="form-group-profile">
                            <label>Email</label>
                            <input name="emp_mail" value={editData.emp_mail} onChange={handleEditChange} />
                        </div>
                        <div className="form-group-profile">
                            <label>Телефон</label>
                            <input name="emp_phone" value={editData.emp_phone} onChange={handleEditChange} />
                        </div>
                        <div className="form-group-profile">
                            <label>Статус</label>
                            <select name="emp_status" value={editData.emp_status} onChange={handleEditChange}>
                                <option value="работает">Работает</option>
                                <option value="в_отпуске">В отпуске</option>
                                <option value="удалёнка">Удалёнка</option>
                                <option value="уволен">Уволен</option>
                            </select>
                        </div>
                        <div className="form-group-profile">
                            <label>Приватность</label>
                            <select name="privacy_level" value={editData.privacy_level} onChange={handleEditChange}>
                                <option value="open">Открытый</option>
                                <option value="restricted">Ограниченный</option>
                                <option value="hidden">Скрытый</option>
                            </select>
                        </div>
                        <div className="form-group-profile">
                            <label>Отдел</label>
                            <select name="dept_id" value={editData.dept_id} onChange={handleEditChange}>
                                <option value="">—</option>
                                {departments.map(d => (
                                    <option key={d.dept_id} value={d.dept_id}>{d.dept_name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group-profile">
                            <label>Должность</label>
                            <select name="pos_id" value={editData.pos_id} onChange={handleEditChange}>
                                <option value="">—</option>
                                {positions.map(p => (
                                    <option key={p.pos_id} value={p.pos_id}>{p.pos_name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group-profile">
                            <label>Дата приёма</label>
                            <input type="date" name="emp_hire_date" value={editData.emp_hire_date} onChange={handleEditChange} />
                        </div>
                        <div className="form-group-profile">
                            <label>День рождения</label>
                            <input type="date" name="emp_birthday" value={editData.emp_birthday} onChange={handleEditChange} />
                        </div>
                        <div className="form-group-profile">
                            <button className="save-btn" onClick={handleSave} disabled={saving}>
                                {saving ? 'Сохранение...' : 'Сохранить'}
                            </button>
                            <button className="cancel-btn" onClick={() => setEditMode(false)}>Отмена</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default UserProfile;