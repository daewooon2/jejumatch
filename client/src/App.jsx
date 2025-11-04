import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfileCreationPage from './pages/ProfileCreationPage';
import DiscoveryPage from './pages/DiscoveryPage';
import MatchesPage from './pages/MatchesPage';
import ChatRoomPage from './pages/ChatRoomPage';
import LikesReceivedPage from './pages/LikesReceivedPage';

import './assets/styles/global.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* 공개 라우트 */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* 보호된 라우트 */}
          <Route path="/" element={
            <ProtectedRoute>
              <DiscoveryPage />
            </ProtectedRoute>
          } />
          
          <Route path="/my-profile" element={
            <ProtectedRoute>
              <ProfileCreationPage />
            </ProtectedRoute>
          } />
          
          <Route path="/matches" element={
            <ProtectedRoute>
              <MatchesPage />
            </ProtectedRoute>
          } />

          <Route path="/likes-received" element={
            <ProtectedRoute>
              <LikesReceivedPage />
            </ProtectedRoute>
          } />

          <Route path="/chat/:matchId" element={
            <ProtectedRoute>
              <ChatRoomPage />
            </ProtectedRoute>
          } />

          {/* 기본 리다이렉트 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
