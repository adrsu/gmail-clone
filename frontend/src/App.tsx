import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Box } from '@mui/material';
import { RootState } from './store';
import Login from './components/auth/Login';
import MultiStepRegister from './components/auth/MultiStepRegister';
import Dashboard from './components/dashboard/Dashboard';
import Layout from './components/layout/Layout';
import { LandingPage } from './components/landing';

function App() {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Routes>
        <Route 
          path="/landing" 
          element={isAuthenticated ? <Navigate to="/" /> : <LandingPage />} 
        />
        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to="/" /> : <Login />} 
        />
        <Route 
          path="/register" 
          element={isAuthenticated ? <Navigate to="/" /> : <MultiStepRegister />} 
        />
        <Route 
          path="/" 
          element={
            isAuthenticated ? (
              <Layout>
                <Dashboard />
              </Layout>
            ) : (
              <LandingPage />
            )
          } 
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Box>
  );
}

export default App; 