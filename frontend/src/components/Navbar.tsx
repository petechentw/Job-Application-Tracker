import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <span className="font-semibold text-gray-900">Job Tracker</span>
        <Link to="/" className="text-sm text-gray-600 hover:text-gray-900">Applications</Link>
        <Link to="/resumes" className="text-sm text-gray-600 hover:text-gray-900">Resumes</Link>
        <Link to="/analytics" className="text-sm text-gray-600 hover:text-gray-900">Analytics</Link>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">{user?.email}</span>
        <button
          onClick={handleLogout}
          className="text-sm text-red-500 hover:text-red-700"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
