import { createContext } from 'react';

const AuthContext = createContext({
  auth: { user: null, token: null },
  setAuth: () => {},
  logout: () => {}
});

export default AuthContext;
