// frontend/src/api.js
export const API_BASE =
  process.env.NODE_ENV === 'production'
    ? 'https://ricogpa-wov9.onrender.com/api'
    : 'http://localhost:5000/api';