import { useEffect, useState } from 'react';
import Header from '../components/Header';
import '../styles/MainWindow.css';
import Sidebar from '../components/sidebar';   // add this

import { Icon } from '@iconify/react';

function GuestWindow() {
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [selectedDeptId, setSelectedDeptId] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const fetchGuestData = async () => {
            try {
                const [empRes, deptRes] = await Promise.all([
                    fetch('http://127.0.0.1:8000/guest/employees'),
                    fetch('http://127.0.0.1:8000/guest/departments')
                ]);
                const employeesData = await empRes.json();
                const departmentsData = await deptRes.json();
                setEmployees(employeesData);
                setDepartments(departmentsData);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchGuestData();
    }, []);
    const filteredEmployees = selectedDeptId
        ? employees.filter(emp => emp.dept_id === selectedDeptId)
        : employees;
    if (loading) return <div className="loading">Загрузка...</div>;

    return (
        <div className="main-window">
            <Header showBack={true} />
            <div className="main-layout">
                <Sidebar
                    departments={departments}
                    selectedDeptId={selectedDeptId}
                    onSelectDepartment={setSelectedDeptId}
                    isGuest={true}                       // hides user panel
                />
                <main className="content">
                    <div className="cards-container">
                        {filteredEmployees.map(emp => (
                            <div key={emp.emp_id} className="employee-card">
                                <div className="card-image-placeholder">
                                    {emp.emp_photo ? (
                                        <img
                                            src={`http://127.0.0.1:8000/photos/${emp.emp_photo}`}
                                            alt="avatar"
                                            style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover' }}
                                        />
                                    ) : (
                                        <Icon icon="iconamoon:profile-circle-fill" width="100" height="100" />
                                    )}
                                </div>
                                <div className="card-details">
                                    <div className="card-name">
                                        {emp.emp_surname} {emp.emp_name} {emp.emp_patronym || ''}
                                    </div>
                                    {emp.pos_name && (
                                        <div className="card-row">
                                            <span className="card-label">Должность:</span>
                                            <span className="card-value">{emp.pos_name}</span>
                                        </div>
                                    )}
                                    {emp.emp_mail && (
                                        <div className="card-row">
                                            <span className="card-label">Email:</span>
                                            <span className="card-value">{emp.emp_mail}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </main>
            </div>
        </div>
    );
}

export default GuestWindow;