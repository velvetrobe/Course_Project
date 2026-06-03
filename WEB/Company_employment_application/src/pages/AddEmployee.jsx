import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import '../styles/FormPage.css';

const API_BASE = 'http://127.0.0.1:8000';

function AddEmployee() {
    const navigate = useNavigate();
    const [departments, setDepartments] = useState([]);
    const [positions, setPositions] = useState([]);
    const [form, setForm] = useState({
        emp_name: '',
        emp_surname: '',
        emp_patronym: '',
        emp_mail: '',
        emp_phone: '',
        emp_hire_date: '',
        emp_status: 'работает',
        dept_id: '',
        pos_id: '',
        user_login: '',
        user_password: '',
        user_role: 'сотрудник',
        emp_birthday: ''
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [deptRes, posRes] = await Promise.all([
                    fetch(`${API_BASE}/get_departments`),
                    fetch(`${API_BASE}/get_positions`)
                ]);
                setDepartments(await deptRes.json());
                setPositions(await posRes.json());
            } catch (err) {
                console.error(err);
            }
        };
        fetchData();
    }, []);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            if (form.emp_phone.trim() !== '') {
                const phoneClean = form.emp_phone.trim();
                const validPhoneRegex = /^\+?[\d\s\-()]{7,}$/;
                const digitsOnly = phoneClean.replace(/\D/g, '');
                if (!validPhoneRegex.test(phoneClean)) {
                    setError('Телефон содержит недопустимые символы. Используйте цифры, пробелы или скобки');
                    return;
                }
                if (digitsOnly.length < 10 || digitsOnly.length > 11) {
                    setError('Телефон должен содержать от 10 до 11 цифр');
                    return;
                }
            }

            const hireDate = new Date(form.emp_hire_date);
            const birthDate = new Date(form.emp_birthday);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const eighteenthBirthday = new Date(
                birthDate.getFullYear() + 18,
                birthDate.getMonth(),
                birthDate.getDate()
            );

            if (hireDate < birthDate) {
                setError('Дата приёма не может быть раньше даты рождения');
                return;
            }
            if (hireDate >= today && birthDate >= today) {
                setError('Дата приёма и рождения не может быть сегодня или в будущем');
                return;
            }
            if (hireDate < eighteenthBirthday) {
                setError('Сотрудник был нанят до его 18-летия');
                return;
            }

            const payload = {
                ...form,
                dept_id: form.dept_id ? parseInt(form.dept_id) : null,
                pos_id: form.pos_id ? parseInt(form.pos_id) : null,
                emp_hire_date: form.emp_hire_date || null,
                emp_phone: form.emp_phone || null,
                emp_patronym: form.emp_patronym || null
            };
            const res = await fetch(`${API_BASE}/create_employee`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'Ошибка создания сотрудника');
            }
            navigate('/main', { replace: true });
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="add-employee-page">
            <Header showBack={true} />
            <div className="add-employee-container">
                <h2>Добавить сотрудника</h2>
                {error && <div className="error">{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="add-employee-group">
                        <label className="add-employee-label">Имя *</label>
                        <input name="emp_name" value={form.emp_name} onChange={handleChange} required />
                    </div>
                    <div className="add-employee-group">
                        <label className="add-employee-label">Фамилия *</label>
                        <input name="emp_surname" value={form.emp_surname} onChange={handleChange} required />
                    </div>
                    <div className="add-employee-group">
                        <label className="add-employee-label">Отчество</label>
                        <input name="emp_patronym" value={form.emp_patronym} onChange={handleChange} />
                    </div>
                    <div className="add-employee-group">
                        <label className="add-employee-label">Email *</label>
                        <input type="email" name="emp_mail" value={form.emp_mail} onChange={handleChange} required />
                    </div>
                    <div className="add-employee-group">
                        <label className="add-employee-label">Телефон</label>
                        <input name="emp_phone" value={form.emp_phone} onChange={handleChange} />
                    </div>
                    <div className="add-employee-group">
                        <label className="add-employee-label">Дата приёма *</label>
                        <input type="date" name="emp_hire_date" value={form.emp_hire_date} onChange={handleChange} required />
                    </div>
                    <div className="add-employee-group">
                        <label className="add-employee-label">Дата рождения *</label>
                        <input type="date" name="emp_birthday" value={form.emp_birthday} onChange={handleChange} required />
                    </div>
                    <div className="add-employee-group">
                        <label className="add-employee-label">Статус</label>
                        <select name="emp_status" value={form.emp_status} onChange={handleChange}>
                            <option value="работает">Работает</option>
                            <option value="в_отпуске">В отпуске</option>
                            <option value="удалёнка">Удалёнка</option>
                        </select>
                    </div>
                    <div className="add-employee-group">
                        <label className="add-employee-label">Отдел *</label>
                        <select name="dept_id" value={form.dept_id} onChange={handleChange} required>
                            <option value="">—</option>
                            {departments.map(d => (
                                <option key={d.dept_id} value={d.dept_id}>{d.dept_name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="add-employee-group">
                        <label className="add-employee-label">Должность *</label>
                        <select name="pos_id" value={form.pos_id} onChange={handleChange} required>
                            <option value="">—</option>
                            {positions.map(p => (
                                <option key={p.pos_id} value={p.pos_id}>{p.pos_name}</option>
                            ))}
                        </select>
                    </div>
                    <hr />
                    <div className="add-employee-group">
                        <label className="add-employee-label">Логин *</label>
                        <input name="user_login" value={form.user_login} onChange={handleChange} required />
                    </div>
                    <div className="add-employee-group">
                        <label className="add-employee-label">Пароль *</label>
                        <input type="password" name="user_password" value={form.user_password} onChange={handleChange} required />
                    </div>
                    <div className="add-employee-group">
                        <label className="add-employee-label">Роль *</label>
                        <select name="user_role" value={form.user_role} onChange={handleChange}>
                            <option value="сотрудник">Сотрудник</option>
                            <option value="руководитель">Руководитель</option>
                            <option value="администратор">Администратор</option>
                        </select>
                    </div>
                    <button type="submit" className="add-employee-save-btn" disabled={saving}>
                        {saving ? 'Создание...' : 'Создать'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default AddEmployee;