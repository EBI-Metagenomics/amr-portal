const hostname = window.location.hostname;
const isDev = hostname === 'localhost';

// TODO: this should probably be read from the environment
const devApiBaseUrl = 'http://localhost:8000/api';
const prodApiBaseUrl = '/amr/api';
const apiBaseUrl = isDev ? devApiBaseUrl : prodApiBaseUrl;

export default {
  apiBaseUrl
};