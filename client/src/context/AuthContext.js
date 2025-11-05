import { createContext, useState, useEffect } from 'react';
import { api } from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));
  
  useEffect(() => {
    if (token) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, [token]);
  
  const loadUser = async () => {
    try {
      console.log('👤 사용자 정보 로딩 시작...');
      const res = await api.get('/profile/me');
      console.log('✅ 사용자 정보 로드 성공:', res.data.user);
      setUser(res.data.user);
    } catch (error) {
      console.error('❌ 사용자 정보 로드 실패:', error);
      console.error('에러 상세:', {
        status: error.response?.status,
        message: error.message,
        code: error.code
      });
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    } finally {
      console.log('✅ 로딩 상태 해제');
      setLoading(false);
    }
  };
  
  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
  };
  
  const register = async (userData) => {
    const res = await api.post('/auth/register', userData);
    localStorage.setItem('token', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
  };
  
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };
  
  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      token,
      login, 
      register,
      logout, 
      loadUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
