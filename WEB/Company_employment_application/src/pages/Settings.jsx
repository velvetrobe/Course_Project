import { useState, useEffect, useRef } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/sidebar';
import { Icon } from '@iconify/react';
import '../styles/MainWindow.css';
import '../styles/Settings.css';

const API_BASE = 'http://127.0.0.1:8000';

function Settings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        emp_name: '',
        emp_surname: '',
        emp_patronym: '',
        emp_mail: '',
        emp_phone: '',
        emp_status: '',
        privacy_level: ''
    });

    const [departments, setDepartments] = useState([]);
    // eslint-disable-next-line no-unused-vars
    const [positions, setPositions] = useState([]);
    const [currentUserInfo, setCurrentUserInfo] = useState({
        user_name: '',
        dept_name: '',
        user_role: ''
    });
    const [photoUrl, setPhotoUrl] = useState('');
    const fileInputRef = useRef(null);

    const currentUserRole = localStorage.getItem('user_role');
    const currentUserId = localStorage.getItem('user_emp_id')
        ? parseInt(localStorage.getItem('user_emp_id'))
        : null;

    useEffect(() => {
        const fetchData = async () => {
            try {
                const headers = { 'X-User-Id': localStorage.getItem('acc_id') };
                const [empRes, deptRes, posRes] = await Promise.all([
                    fetch(`${API_BASE}/get_employees`, { headers }),
                    fetch(`${API_BASE}/get_departments`),
                    fetch(`${API_BASE}/get_positions`)
                ]);
                const employeesData = await empRes.json();
                const departmentsData = await deptRes.json();
                const positionsData = await posRes.json();

                setDepartments(departmentsData);
                setPositions(positionsData);

                const myProfile = employeesData.find(emp => emp.emp_id == currentUserId);
                if (myProfile) {
                    setFormData({
                        emp_name: myProfile.emp_name || '',
                        emp_surname: myProfile.emp_surname || '',
                        emp_patronym: myProfile.emp_patronym || '',
                        emp_mail: myProfile.emp_mail || '',
                        emp_phone: myProfile.emp_phone || '',
                        emp_status: myProfile.emp_status || '',
                        privacy_level: myProfile.privacy_level || 'open'
                    });

                    const deptName = departmentsData.find(d => d.dept_id == myProfile.dept_id)?.dept_name || '—';
                    setCurrentUserInfo({
                        name: `${myProfile.emp_surname} ${myProfile.emp_name}`,
                        department: deptName,
                        role: currentUserRole == 'администратор' ? 'Администратор' :
                            currentUserRole == 'руководитель' ? 'Руководитель' : 'Сотрудник',
                        emp_photo: myProfile.emp_photo || null

                    });

                    setPhotoUrl(`${API_BASE}/employees/${currentUserId}/photo?t=${Date.now()}`);
                }
            } catch (err) {
                console.error(err);
                setError('Не удалось загрузить данные');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [currentUserId, currentUserRole]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');
        setError('');

        try {
            const headers = {
                'Content-Type': 'application/json',
                'X-User-Id': localStorage.getItem('acc_id')
            };

            const updatePayload = {
                emp_name: formData.emp_name,
                emp_surname: formData.emp_surname,
                emp_patronym: formData.emp_patronym || null,
                emp_mail: formData.emp_mail,
                emp_phone: formData.emp_phone || null,
                emp_status: formData.emp_status

            };

            const updateResponse = await fetch(`${API_BASE}/change_employee/${currentUserId}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(updatePayload)
            });

            if (!updateResponse.ok) {
                const errData = await updateResponse.json();
                throw new Error(errData.detail || 'Ошибка обновления профиля');
            }

            const privacyResponse = await fetch(`${API_BASE}/employees/${currentUserId}/privacy`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ privacy_level: formData.privacy_level })
            });

            if (!privacyResponse.ok) {
                const errData = await privacyResponse.json();
                throw new Error(errData.detail || 'Ошибка обновления приватности');
            }

            setMessage('Профиль успешно обновлён');
            setTimeout(() => window.location.reload(), 1000);
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarClick = () => {
        fileInputRef.current.click();
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const headers = {
                'X-User-Id': localStorage.getItem('acc_id')
            };

            const res = await fetch(`${API_BASE}/employees/${currentUserId}/photo`, {
                method: 'PUT',
                headers,
                body: formData
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'Ошибка загрузки фото');
            }

            setPhotoUrl(`${API_BASE}/employees/${currentUserId}/photo?t=${Date.now()}`);
            setMessage('Фото обновлено');
        } catch (err) {
            setError(err.message);
        }
    };

    if (loading) return <div className="loading">Загрузка...</div>;

    return (
        <div className="main-window">
            <Header showBack={true} />
            <div className="main-layout">
                <Sidebar
                    departments={departments}
                    selectedDeptId={null}
                    onSelectDepartment={() => { }}
                    currentUser={currentUserInfo}
                />
                <main className="content settings-content">
                    <div className="settings-container">
                        <h2>Настройки профиля</h2>
                        {message && <div className="settings-success">{message}</div>}
                        {error && <div className="settings-error">{error}</div>}
                        <form onSubmit={handleSubmit} className="settings-form">
                            <div className="form-section">
                                <h6>Личная информация</h6>
                                <div className="form-row">
                                    <label>Имя</label>
                                    <input
                                        type="text"
                                        name="emp_name"
                                        value={formData.emp_name}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                                <div className="form-row">
                                    <label>Фамилия</label>
                                    <input
                                        type="text"
                                        name="emp_surname"
                                        value={formData.emp_surname}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                                <div className="form-row">
                                    <label>Отчество</label>
                                    <input
                                        type="text"
                                        name="emp_patronym"
                                        value={formData.emp_patronym}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="form-row">
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        name="emp_mail"
                                        value={formData.emp_mail}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                                <div className="form-row">
                                    <label>Телефон</label>
                                    <input
                                        type="tel"
                                        name="emp_phone"
                                        value={formData.emp_phone}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div className="form-section">
                                <h6>Статус</h6>
                                <div className="form-row">
                                    <label>Текущий статус</label>
                                    <select name="emp_status" value={formData.emp_status} onChange={handleChange}>
                                        <option value="работает">Работает</option>
                                        <option value="в_отпуске">В отпуске</option>
                                        <option value="удалёнка">Удалёнка</option>
                                        <option value="уволен">Уволен</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-section">
                                <h6>Приватность</h6>
                                <div className="form-row">
                                    <label>Уровень видимости</label>
                                    <select name="privacy_level" value={formData.privacy_level} onChange={handleChange}>
                                        <option value="open">Открытый (все видят все данные)</option>
                                        <option value="restricted">Ограниченный (скрыты телефон, отдел, должность)</option>
                                        <option value="hidden">Скрытый (только имя, фамилия, статус)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-section">
                                <h6>Аватар</h6>
                                <div className="avatar-upload">
                                    <div className="current-avatar">
                                        {photoUrl ? (
                                            <img
                                                src={photoUrl}
                                                alt="Avatar"
                                                style={{
                                                    width: 80,
                                                    height: 80,
                                                    borderRadius: '50%',
                                                    objectFit: 'cover'
                                                }}
                                            />
                                        ) : (
                                            <Icon icon="iconamoon:profile-circle-fill" width="80" height="80" />
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        style={{ display: 'none' }}
                                        accept="image/*"
                                        onChange={handleFileChange}
                                    />
                                    <button type="button" className="upload-btn" onClick={handleAvatarClick}>
                                        Загрузить фото
                                    </button>
                                </div>
                            </div>

                            <div className="form-actions">
                                <button type="submit" className="save-btn" disabled={saving}>
                                    {saving ? 'Сохранение...' : 'Сохранить изменения'}
                                </button>
                            </div>
                        </form>
                    </div>
                </main>
            </div>
        </div>
    );
}

export default Settings;