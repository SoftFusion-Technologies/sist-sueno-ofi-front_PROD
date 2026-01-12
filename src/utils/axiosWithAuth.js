import axios from 'axios';

const axiosWithAuth = () => {
  const token = localStorage.getItem('authToken');
  return axios.create({
    baseURL: 'https://api.rioromano.com.ar',
    headers: {
      Authorization: token ? `Bearer ${token}` : ''
    }
  });
};

export default axiosWithAuth;
