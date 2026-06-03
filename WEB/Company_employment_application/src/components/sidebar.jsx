import { Icon } from '@iconify/react';
import '../styles/Sidebar.css';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'http://127.0.0.1:8000';

function Sidebar({ departments, selectedDeptId, onSelectDepartment, currentUser, isGuest = false }) {
    console.log("Sidebar received currentUser:", currentUser);
    console.log("Sidebar received departments:", departments);
    const navigate = useNavigate();

    const isAdmin = currentUser?.role === 'Администратор';

    const handleDeptClick = (deptId) => {
        if (selectedDeptId === deptId) {
            onSelectDepartment(null);
        } else {
            onSelectDepartment(deptId);
        }
    };

    return (

        <aside className='sidebar'>
            <div className='departments-sidebar'>
                <h3 className='department-title'>Отделы</h3>
                <div className='departments-list'>
                    {departments.map(dept => (
                        <div
                            key={dept.dept_id}
                            className={`dept-item ${selectedDeptId === dept.dept_id ? 'active' : ''}`}
                            onClick={() => handleDeptClick(dept.dept_id)}
                        >
                            {dept.dept_name}
                        </div>
                    ))}
                    {isAdmin && (<button className='dept-add-btn' onClick={() => navigate('/add-department')}>
                        +
                    </button>)}
                </div>
                {!isGuest && (
                    <div className='user-sidebar'>
                        <div className='role-txt'>{currentUser?.role || "—"}</div>
                        <div className='user-profile'>
                            {currentUser.emp_photo ? (
                                <img
                                    src={`${API_BASE}/photos/${currentUser.emp_photo}`}
                                    alt="avatar"
                                    style={{
                                        width: 100,
                                        height: 100,
                                        borderRadius: '50%',
                                        objectFit: 'cover'
                                    }}
                                />
                            ) : (
                                <Icon icon="iconamoon:profile-circle-fill" width="100" height="100" />
                            )}
                        </div>
                        <div className='user-info'>
                            <p>{currentUser?.name || "—"}</p>
                            <p>{currentUser?.department || "—"}</p>
                        </div>
                        <div className='user-buttons-sidebar'>
                            <button className='user-buttons' onClick={() => window.location.href = "/Settings"}>
                                <img src="/src/assets/settings_icon.png" alt="settigns" width={45} height={45} />
                            </button>
                            <button className='user-buttons' onClick={() => window.location.href = '/'}>
                                <img src="/src/assets/logout_icon.png" alt="settigns" width={45} height={45} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </aside >
    );
}

export default Sidebar;