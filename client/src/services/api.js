import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Axios 인스턴스 생성
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 요청 인터셉터 (토큰 자동 추가)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터 (에러 처리)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 토큰 만료 또는 유효하지 않음
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API 함수들
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (userData) => api.post('/auth/register', userData)
};

export const profileAPI = {
  getMe: () => api.get('/profile/me'),
  updateMe: (data) => api.put('/profile/me', data),
  uploadPhoto: (formData) => api.post('/profile/upload-photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
};

export const usersAPI = {
  getUsers: (filters) => api.get('/users', { params: filters }),
  getUser: (id) => api.get(`/users/${id}`)
};

export const likesAPI = {
  likeUser: (userId) => api.post(`/likes/${userId}`),
  unlikeUser: (userId) => api.delete(`/likes/${userId}`),
  getReceivedLikes: () => api.get('/likes/received'),
  getLikesCount: () => api.get('/likes/count')
};

export const matchesAPI = {
  getMatches: () => api.get('/matches')
};

export const messagesAPI = {
  getMessages: (matchId) => api.get(`/messages/${matchId}`),
  sendMessage: (matchId, text) => api.post(`/messages/${matchId}`, { text })
};
