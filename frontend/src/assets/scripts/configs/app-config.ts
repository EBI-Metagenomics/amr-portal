const hostname = window.location.hostname;
const isDev = hostname === 'localhost';

// TODO: this should probably be read from the environment
const devApiBaseUrl = 'http://localhost:8000/api';
const prodApiBaseUrl = 'http://hh-rke-wp-webadmin-52-master-1.caas.ebi.ac.uk:32027/api';
const apiBaseUrl = isDev ? devApiBaseUrl : prodApiBaseUrl;

export default {
  apiBaseUrl
};