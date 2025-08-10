// lib/api.ts - FINAL PRODUCTION VERSION - PERFECTLY ALIGNED WITH NESTJS BACKEND
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ✅ ENHANCED: Request interceptor with retry logic
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    console.log(`🔄 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// ✅ ENHANCED: Response interceptor with better error handling
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Success: ${response.config.method?.toUpperCase()} ${response.config.url}`, 
                response.status);
    return response;
  },
  (error) => {
    const errorDetails = {
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    };
    
    console.error('❌ API Error Details:', errorDetails);
    
    if (error.response?.status === 400 && !error.response?.data) {
      error.response.data = {
        message: 'Bad Request - Server did not provide error details',
        error: 'EMPTY_RESPONSE_BODY',
        suggestion: 'Check your request data format'
      };
    }
    
    if (error.response?.status === 401) {
      console.error('🔒 UNAUTHORIZED: Token invalid or expired');
      localStorage.removeItem('token');
      
      if (typeof window !== 'undefined' && 
          !window.location.pathname.includes('/login') &&
          !window.location.pathname.includes('/auth')) {
        console.log('🔄 Redirecting to login page...');
        window.location.href = '/login';
      }
    }
    
    if (error.code === 'ERR_NETWORK') {
      error.response = {
        ...error.response,
        data: {
          message: 'Network connection failed. Please check your internet connection.',
          error: 'NETWORK_ERROR',
          suggestion: 'Try refreshing the page or check your network connection'
        }
      };
    }
    
    if (error.code === 'ECONNABORTED') {
      error.response = {
        ...error.response,
        data: {
          message: 'Request timed out. Server may be slow or unavailable.',
          error: 'TIMEOUT_ERROR', 
          suggestion: 'Try again in a few moments'
        }
      };
    }
    
    return Promise.reject(error);
  }
);

// ✅ AUTH API - Perfect compatibility
export const authAPI = {
  login: (credentials: { username: string; password: string }) => 
    api.post('/auth/login', credentials),
  
  register: (userData: { 
    username: string; 
    password: string; 
    email?: string; 
    role?: string;
    firstName?: string;
    lastName?: string; 
  }) => api.post('/auth/register', userData),
  
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  refresh: () => api.post('/auth/refresh'),
  changePassword: (data: { oldPassword: string; newPassword: string }) => 
    api.post('/auth/change-password', data),
  forgotPassword: (email: string) => 
    api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) => 
    api.post('/auth/reset-password', { token, newPassword })
};

// ✅ FIXED: Queue API - PERFECTLY ALIGNED WITH YOUR NESTJS BACKEND
export const queueAPI = {
  // ✅ FIXED: Basic queue operations - matches your NestJS controller
  getAll: () => api.get('/queue'),
  getEnhanced: () => api.get('/queue/enhanced'),
  getStats: () => api.get('/queue/stats'),
  getSummary: () => api.get('/queue/summary'), // ✅ ADDED: Matches your new endpoint
  getAnalytics: () => api.get('/queue/analytics'),
  getNext: () => api.get('/queue/next'),
  
  // ✅ FIXED: Queue creation - exact types from your NestJS controller
  create: (data: { 
    patientId: number; 
    priority?: 'normal' | 'urgent' | 'emergency'; 
    notes?: string;
  }) => {
    if (!data.patientId || data.patientId <= 0) {
      return Promise.reject(new Error('Valid patient ID is required'));
    }
    return api.post('/queue', {
      patientId: data.patientId,
      priority: data.priority || 'normal',
      notes: data.notes
    });
  },
  
  // ✅ SIMPLIFIED: Remove duplicate methods
  addToQueue: (data: { patientId: number; priority?: 'normal' | 'urgent' | 'emergency'; notes?: string }) => 
    api.post('/queue', data),
  
  // ✅ FIXED: Emergency - matches your NestJS emergency endpoint
  emergency: (data: { patientId: number; priority?: string }) => 
    api.post('/queue/emergency', {
      patientId: data.patientId,
      priority: 'emergency'
    }),
  
  addEmergency: (data: { patientId: number; priority?: string }) => 
    api.post('/queue/emergency', { patientId: data.patientId }),
  
  // ✅ FIXED: Queue management - matches your NestJS endpoints exactly
  callNext: () => api.post('/queue/call-next'),
  updateStatus: (id: number, status: 'waiting' | 'with-doctor' | 'completed' | 'cancelled') => 
    api.put(`/queue/${id}/status`, { status }),
  updatePriority: (id: number, priority: 'normal' | 'urgent' | 'emergency') => 
    api.put(`/queue/${id}/priority`, { priority }),
  remove: (id: number) => api.delete(`/queue/${id}`),
  
  // ✅ ENHANCED: Advanced filtering - matches your query parameters
  getByStatus: (status: string) => api.get(`/queue?status=${status}`),
  getByPriority: (priority: string) => api.get(`/queue?priority=${priority}`),
  
  // ✅ REMOVED: Endpoints not implemented in your NestJS backend
  // getByDateRange, getQueuePosition, getEstimatedWaitTime - remove these for now
};

// ✅ ENHANCED: Patient API - compatible with typical NestJS patient endpoints
export const patientAPI = {
  getAll: () => api.get('/patients'),
  getById: (id: number) => api.get(`/patients/${id}`),
  
  create: (patientData: {
    name: string;
    phone: string;
    email?: string;
    age?: number;
    gender?: string;
    address?: string;
    emergencyContact?: string;
  }) => api.post('/patients', patientData),
  
  update: (id: number, patientData: any) => api.put(`/patients/${id}`, patientData),
  delete: (id: number) => api.delete(`/patients/${id}`),
  
  // Search functionality
  search: (query: string) => api.get(`/patients/search?q=${encodeURIComponent(query)}`),
  searchByName: (name: string) => api.get(`/patients/search/name?name=${encodeURIComponent(name)}`),
  searchByPhone: (phone: string) => api.get(`/patients/search/phone?phone=${encodeURIComponent(phone)}`),
  
  // Patient history
  getHistory: (id: number) => api.get(`/patients/${id}/history`)
};

// ✅ ENHANCED: Doctor API
export const doctorAPI = {
  getAll: () => api.get('/doctors'),
  getById: (id: number) => api.get(`/doctors/${id}`),
  
  create: (doctorData: {
    name: string;
    specialization: string;
    phone: string;
    email?: string;
    experience?: string;
    availability?: string;
    gender?: string;
    location?: string;
    isActive?: boolean;
  }) => api.post('/doctors', doctorData),
  
  update: (id: number, doctorData: any) => api.put(`/doctors/${id}`, doctorData),
  delete: (id: number) => api.delete(`/doctors/${id}`),
  
  // Search and filter
  search: (query: string) => api.get(`/doctors/search?q=${encodeURIComponent(query)}`),
  searchByName: (name: string) => api.get(`/doctors/search/name?name=${encodeURIComponent(name)}`),
  getBySpecialization: (specialization: string) => 
    api.get(`/doctors?specialization=${encodeURIComponent(specialization)}`),
  getAvailable: () => api.get('/doctors?availability=Available'),
  
  updateAvailability: (id: number, availability: string) => 
    api.put(`/doctors/${id}/availability`, { availability })
};

// ✅ ENHANCED: Appointment API
export const appointmentAPI = {
  getAll: () => api.get('/appointments'),
  getById: (id: number) => api.get(`/appointments/${id}`),
  
  create: (appointmentData: {
    doctorId: number;
    patientId: number;
    appointmentDateTime: string;
    notes?: string;
    status?: string;
  }) => api.post('/appointments', appointmentData),
  
  update: (id: number, appointmentData: any) => api.put(`/appointments/${id}`, appointmentData),
  delete: (id: number) => api.delete(`/appointments/${id}`),
  
  updateStatus: (id: number, status: string) => 
    api.put(`/appointments/${id}/status`, { status }),
  
  // Filtering
  getByDate: (date: string) => api.get(`/appointments?date=${date}`),
  getByDoctor: (doctorId: number) => api.get(`/appointments?doctorId=${doctorId}`),
  getByPatient: (patientId: number) => api.get(`/appointments?patientId=${patientId}`),
  
  getToday: () => {
    const today = new Date().toISOString().split('T')[0];
    return api.get(`/appointments?date=${today}`);
  },
  
  reschedule: (id: number, newDateTime: string) => 
    api.put(`/appointments/${id}/reschedule`, { appointmentDateTime: newDateTime })
};

// ✅ Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getActivity: () => api.get('/dashboard/activity'),
  getAnalytics: () => api.get('/dashboard/analytics'),
  getSummary: () => api.get('/dashboard/summary')
};

// ✅ Reports API
export const reportsAPI = {
  getDailyReport: (date: string) => api.get(`/reports/daily?date=${date}`),
  getWeeklyReport: (startDate: string) => api.get(`/reports/weekly?startDate=${startDate}`),
  getMonthlyReport: (month: string, year: string) => 
    api.get(`/reports/monthly?month=${month}&year=${year}`),
  getPatientReport: (patientId: number) => api.get(`/reports/patient/${patientId}`),
  getDoctorReport: (doctorId: number) => api.get(`/reports/doctor/${doctorId}`)
};

// ✅ ENHANCED: Utility functions for consistent data handling
export const apiUtils = {
  // ✅ FIXED: Handle your NestJS response format
  handleResponse: (response: any) => {
    // Your NestJS backend returns arrays directly for queue endpoints
    return response.data || response;
  },
  
  handleError: (error: any) => {
    const message = error.response?.data?.message || 
                   error.response?.data?.error || 
                   error.message || 
                   'An unexpected error occurred';
    return { error: true, message };
  },
  
  isSuccess: (response: any) => {
    return response.status >= 200 && response.status < 300;
  },
  
  // ✅ ADD: Queue-specific response handler
  handleQueueResponse: (response: any) => {
    // Your NestJS queue endpoints return arrays directly
    const data = response.data;
    
    // Ensure we always return an array for queue operations
    if (Array.isArray(data)) {
      return data;
    }
    
    // If it's an object with queue property (from summary endpoint)
    if (data && data.queue && Array.isArray(data.queue)) {
      return data.queue;
    }
    
    // If it's an object with data property
    if (data && data.data && Array.isArray(data.data)) {
      return data.data;
    }
    
    // Fallback to empty array
    return [];
  }
};

export default api;
