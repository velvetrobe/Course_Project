import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import '../styles/FormPage.css';

const API_BASE = 'http://127.0.0.1:8000';

function AddPosition() {
    const navigate = useNavigate();
    const [posName, setPosName] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE}/create_position`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pos_name: posName })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'Ошибка создания должности');
            }
            navigate('/main', { replace: true });
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="add-department-page">   {/* reuse same page class */}
            <Header showBack={true} />
            <div className="add-department-container">  {/* reuse container */}
                <h2>Добавить должность</h2>
                {error && <div className="error">{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="add-department-group">   {/* reuse group */}
                        <label className="add-department-label">Название должности *</label>
                        <input
                            value={posName}
                            onChange={(e) => setPosName(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="add-department-save-btn" disabled={saving}>
                        {saving ? 'Создание...' : 'Создать'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default AddPosition;