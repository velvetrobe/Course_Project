import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import '../styles/Login_window.css';

function LoginPage() {
    const navigate = useNavigate();

    const [login, setLogin] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch('http://127.0.0.1:8000/Login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 403) {
                    throw new Error('Ваша учётная запись деактивирована. Вы уволены.');
                }
                throw new Error(data.detail || 'Ошибка входа');
            }

            localStorage.setItem('user_role', data.user_role);
            localStorage.setItem('acc_id', data.acc_id);
            if (data.user_emp_id) {
                localStorage.setItem('user_emp_id', data.user_emp_id);
            }
            localStorage.setItem('user_login', data.user_login);

            if (data.user_role === 'администратор' || data.user_role === 'руководитель' || data.user_role === 'сотрудник') {
                navigate('/main');
            } else {
                navigate('/main');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGuestLogin = async () => {
        setError('');
        setLoading(true);
        try {
            localStorage.setItem('user_role', 'гость');
            localStorage.setItem('user_login', 'guest');
            localStorage.setItem('acc_id', '0');
            localStorage.removeItem('user_emp_id');
            navigate('/guest');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="centered-page">
                <Header showBack={false} />
                <main className="login_wrapper_page">
                    <div className="login-card">
                        <form onSubmit={handleSubmit} className="login-form" noValidate>
                            <div className="form-group">
                                <label htmlFor="login">Логин</label>
                                <input
                                    type="text"
                                    id="login"
                                    value={login}
                                    onChange={(e) => setLogin(e.target.value)}
                                    placeholder="Введите ваш логин"
                                    autoComplete="username"
                                    required
                                />
                                <span className="field-error-msg" id="loginError"></span>
                            </div>

                            <div className="form-group">
                                <label htmlFor="password">Пароль</label>
                                <input
                                    type="password"
                                    id="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Введите пароль"
                                    autoComplete="current-password"
                                    required
                                />
                                <span className="field-error-msg" id="passwordError"></span>
                            </div>

                            {error && <div className="error-message" style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
                            <button type="submit" className="btn-submit" disabled={loading}>
                                {loading ? 'Вход...' : 'Войти'}
                            </button>
                            <button type="button" className="btn-submit-guest" onClick={handleGuestLogin} disabled={loading}>
                                {loading ? 'Вход...' : 'Гость'}
                            </button>
                        </form>
                    </div>
                </main>
            </div>
        </>
    );
}

export default LoginPage;