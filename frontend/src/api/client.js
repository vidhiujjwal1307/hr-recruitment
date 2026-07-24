import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const uploadResume = async (formData) => {
  const response = await apiClient.post('/resume/upload-resume', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getCandidates = async () => {
  const response = await apiClient.get('/resume/candidates');
  return response.data;
};

export const createJob = async (jobData) => {
  const response = await apiClient.post('/jobs', jobData);
  return response.data;
};

export const getJobs = async () => {
  const response = await apiClient.get('/jobs');
  return response.data;
};

export const matchCandidate = async (candidateId, jobId) => {
  const response = await apiClient.post('/match', { candidateId, jobId });
  return response.data;
};

export const generateQuestions = async (candidateId, jobId) => {
  const response = await apiClient.post('/questions/generate', { candidateId, jobId });
  return response.data;
};

export const scheduleInterview = async (scheduleData) => {
  const response = await apiClient.post('/schedule', scheduleData);
  return response.data;
};

export default apiClient;
