import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import '../styles/FormPage.css';

const API_BASE = 'http://127.0.0.1:8000';

function AddDepartment() {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        dept_name: '',
        dept_code: '',
        dept_emp_id: ''
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            const payload = {
                dept_name: form.dept_name,
                dept_code: form.dept_code,
                dept_emp_id: form.dept_emp_id ? parseInt(form.dept_emp_id) : null
            };
            const res = await fetch(`${API_BASE}/create_departments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'Ошибка создания отдела');
            }
            navigate('/main', { replace: true });
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="add-department-page">
            <Header showBack={true} />
            <div className="add-department-container">
                <h2>Добавить отдел</h2>
                {error && <div className="error">{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="add-department-group">
                        <label className="add-department-label">Название отдела *</label>
                        <input name="dept_name" value={form.dept_name} onChange={handleChange} required />
                    </div>
                    <div className="add-department-group">
                        <label className="add-department-label">Код отдела *</label>
                        <input name="dept_code" value={form.dept_code} onChange={handleChange} required />
                    </div>
                    <div className="add-department-group">
                        <label className="add-department-label">Руководитель (ID сотрудника)</label>
                        <input name="dept_emp_id" type="number" value={form.dept_emp_id} onChange={handleChange} />
                    </div>
                    <button type="submit" className="add-department-save-btn" disabled={saving}>
                        {saving ? 'Создание...' : 'Создать'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default AddDepartment;