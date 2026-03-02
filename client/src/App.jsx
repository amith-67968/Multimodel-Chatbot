import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';

export default function App() {
    const { user, loading } = useAuth();

    return (
        <Routes>
            <Route path="/" element={<Landing />} />
            <Route
                path="/login"
                element={!loading && user ? <Navigate to="/chat" replace /> : <Login />}
            />
            <Route
                path="/register"
                element={!loading && user ? <Navigate to="/chat" replace /> : <Register />}
            />
            <Route
                path="/chat"
                element={
                    <ProtectedRoute>
                        <Chat />
                    </ProtectedRoute>
                }
            />
            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
