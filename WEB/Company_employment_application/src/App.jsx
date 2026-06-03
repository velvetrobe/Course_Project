import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import './App.css';
import MainWindow from './pages/MainWindow';
import GuestWindow from './pages/GuestWindow';
import Settings from './pages/Settings';
import UserProfile from './pages/UserProfile';
import AddDepartment from './pages/AddDepartment';
import AddPosition from './pages/AddPosition.jsx';
import AddEmployee from './pages/AddEmployee';
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/main" element={<MainWindow />} />
        <Route path="/guest" element={<GuestWindow />} />
        <Route path="/settings" element={<Settings />}></Route>
        <Route path="/employee/:empId" element={<UserProfile />} />
        <Route path="/add-department" element={<AddDepartment />} />
        <Route path="/add-position" element={<AddPosition />} />
        <Route path="/add-employee" element={<AddEmployee />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;