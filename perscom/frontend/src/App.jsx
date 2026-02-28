import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SoundProvider } from './context/SoundContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Personnel from './pages/Personnel';
import Operations from './pages/Operations';
import Evaluations from './pages/Evaluations';
import Orbat from './pages/Orbat';
import EventLog from './pages/EventLog';
import MarineProfile from './pages/MarineProfile';
import Settings from './pages/Settings';
import Documents from './pages/Documents';
import WelcomeScreen from './components/WelcomeScreen';
import NoPersonnelModal from './components/NoPersonnelModal';

function Loader() {
  return (
    <div className="flex items-center justify-center h-screen bg-[#06091a]">
      <div className="text-[#3b82f6] font-mono text-xs animate-pulse tracking-widest">
        INITIALIZING PERSCOM...
      </div>
    </div>
  );
}

// Staff-only: blocks guests and marines (admin + moderator only)
function StaffRoute({ children }) {
  const { user, loading, isGuest, isMarine } = useAuth();
  if (loading) return <Loader />;
  if (!user || isGuest || isMarine) return <Navigate to="/personnel" replace />;
  return children;
}

// Full-access: real user only, optionally admin-only
function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading, isAdmin, isGuest } = useAuth();
  if (loading) return <Loader />;
  if (!user || isGuest) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  return children;
}

// Any authenticated session (including guest and marine)
function AuthRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<AuthRoute><Layout /></AuthRoute>}>
        {/* Staff-only routes (admin + moderator only, not marines) */}
        <Route index element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="evaluations" element={<StaffRoute><Evaluations /></StaffRoute>} />
        <Route path="eventlog" element={<StaffRoute><EventLog /></StaffRoute>} />
        <Route path="settings" element={<ProtectedRoute adminOnly><Settings /></ProtectedRoute>} />

        {/* Marine + Guest + Staff accessible routes (read-only enforcement at API level) */}
        <Route path="personnel" element={<Personnel />} />
        <Route path="personnel/:id" element={<MarineProfile />} />
        <Route path="roster" element={<Orbat />} />
        <Route path="documents" element={<Documents />} />
        <Route path="operations" element={<Operations />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SoundProvider>
        <WelcomeScreen />
        <NoPersonnelModal />
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <AppRoutes />
        </BrowserRouter>
      </SoundProvider>
    </AuthProvider>
  );
}
