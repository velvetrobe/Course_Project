import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import '../styles/Header.css';

function Header({ showBack = false }) {
    const navigate = useNavigate();
    return (
        <header>
            {showBack && (<button className='backButton' onClick={() => navigate(-1)}> Вернутся </button>)}
            <img src={logo} alt="Company logo" />
            <h1 className="Brand_Title">Company</h1>

        </header>
    );
}
export default Header;