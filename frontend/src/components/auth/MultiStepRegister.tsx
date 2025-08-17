import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Container,
  Alert,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
} from '@mui/material';
import { ArrowBack, ArrowForward } from '@mui/icons-material';
import { loginSuccess } from '../../store/slices/authSlice';
import { config, API_ENDPOINTS } from '../../config/config';

const MultiStepRegister: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const steps = ['Your Name', 'Choose Username', 'Create Password'];

  useEffect(() => {
    // Force dark theme styles
    document.body.style.backgroundColor = '#0f0f23';
    document.body.style.color = 'white';
    
    return () => {
      // Cleanup on unmount
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // Reset username availability when username changes
    if (name === 'username') {
      setUsernameAvailable(null);
      setError('');
    }
  };

  const checkUsernameAvailability = async (username: string) => {
    if (!username.trim()) {
      setUsernameAvailable(null);
      return;
    }

    setCheckingUsername(true);
    setError('');

    try {
      const email = `${username}@27send.com`;
      const response = await fetch(`${config.API_BASE_URL}${API_ENDPOINTS.AUTH.CHECK_EMAIL_AVAILABILITY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setUsernameAvailable(data.available);
        if (!data.available) {
          setError('This username is already taken. Please choose another one.');
        }
      } else {
        setError('Unable to check username availability. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleUsernameBlur = () => {
    if (formData.username.trim()) {
      checkUsernameAvailability(formData.username.trim());
    }
  };

  const handleNext = () => {
    setError('');
    
    if (activeStep === 0) {
      // Validate name step
      if (!formData.first_name.trim() || !formData.last_name.trim()) {
        setError('Please enter both first and last name');
        return;
      }
    } else if (activeStep === 1) {
      // Validate username step
      if (!formData.username.trim()) {
        setError('Please enter a username');
        return;
      }
      if (usernameAvailable === false) {
        setError('Please choose an available username');
        return;
      }
      if (usernameAvailable === null) {
        checkUsernameAvailability(formData.username.trim());
        return;
      }
    }
    
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setError('');
    setActiveStep(prev => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      const email = `${formData.username}@27send.com`;
      const response = await fetch(`${config.API_BASE_URL}${API_ENDPOINTS.AUTH.REGISTER}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password: formData.password,
          first_name: formData.first_name,
          last_name: formData.last_name,
        }),
      });

      if (response.ok) {
        const userData = await response.json();
        // After registration, automatically log in
        const loginFormData = new FormData();
        loginFormData.append('username', email);
        loginFormData.append('password', formData.password);

        const loginResponse = await fetch(`${config.API_BASE_URL}${API_ENDPOINTS.AUTH.LOGIN}`, {
          method: 'POST',
          body: loginFormData,
        });

        if (loginResponse.ok) {
          const loginData = await loginResponse.json();
          dispatch(loginSuccess({
            user: userData,
            token: loginData.access_token,
          }));
          navigate('/');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Registration failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    navigate('/');
  };

  const textFieldStyles = {
    '& .MuiOutlinedInput-root': {
      color: 'white',
      '& fieldset': {
        borderColor: 'rgba(255, 255, 255, 0.3)',
      },
      '&:hover fieldset': {
        borderColor: 'rgba(255, 255, 255, 0.5)',
      },
      '&.Mui-focused fieldset': {
        borderColor: '#64b5f6',
      },
    },
    '& .MuiInputLabel-root': {
      color: 'rgba(255, 255, 255, 0.7)',
      '&:hover': {
        color: 'rgba(255, 255, 255, 0.9)',
      },
      '&.Mui-focused': {
        color: '#64b5f6',
      },
    },
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box sx={{ width: '100%' }}>
            <Typography variant="h6" sx={{ mb: 3, textAlign: 'center', color: 'white' }}>
              What's your name?
            </Typography>
            <TextField
              margin="normal"
              required
              fullWidth
              id="first_name"
              label="First Name"
              name="first_name"
              autoComplete="given-name"
              autoFocus
              value={formData.first_name}
              onChange={handleChange}
              sx={textFieldStyles}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="last_name"
              label="Last Name"
              name="last_name"
              autoComplete="family-name"
              value={formData.last_name}
              onChange={handleChange}
              sx={textFieldStyles}
            />
          </Box>
        );
      
      case 1:
        return (
          <Box sx={{ width: '100%' }}>
            <Typography variant="h6" sx={{ mb: 3, textAlign: 'center', color: 'white' }}>
              Choose your 27send address
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="username"
                label="Username"
                name="username"
                autoComplete="username"
                autoFocus
                value={formData.username}
                onChange={handleChange}
                onBlur={handleUsernameBlur}
                sx={textFieldStyles}
                InputProps={{
                  endAdornment: checkingUsername ? <CircularProgress size={20} sx={{ color: 'white' }} /> : null,
                }}
              />
              <Typography 
                sx={{ 
                  mb: 1, 
                  color: 'rgba(255, 255, 255, 0.7)', 
                  fontSize: '1rem',
                  whiteSpace: 'nowrap'
                }}
              >
                @27send.com
              </Typography>
            </Box>
            {usernameAvailable === true && (
              <Alert 
                severity="success" 
                sx={{ 
                  mt: 2,
                  background: 'rgba(76, 175, 80, 0.1)',
                  border: '1px solid rgba(76, 175, 80, 0.3)',
                  color: '#c8e6c9',
                  '& .MuiAlert-icon': {
                    color: '#c8e6c9',
                  }
                }}
              >
                Username is available!
              </Alert>
            )}
            <Typography variant="body2" sx={{ mt: 2, color: 'rgba(255, 255, 255, 0.6)', textAlign: 'center' }}>
              You can use letters, numbers & periods
            </Typography>
          </Box>
        );
      
      case 2:
        return (
          <Box sx={{ width: '100%' }}>
            <Typography variant="h6" sx={{ mb: 3, textAlign: 'center', color: 'white' }}>
              Create a strong password
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center' }}>
              Your email: {formData.username}@27send.com
            </Typography>
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="new-password"
              autoFocus
              value={formData.password}
              onChange={handleChange}
              sx={textFieldStyles}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Confirm Password"
              type="password"
              id="confirmPassword"
              autoComplete="new-password"
              value={formData.confirmPassword}
              onChange={handleChange}
              sx={textFieldStyles}
            />
            <Typography variant="body2" sx={{ mt: 2, color: 'rgba(255, 255, 255, 0.6)' }}>
              Use 8 or more characters with a mix of letters, numbers & symbols
            </Typography>
          </Box>
        );
      
      default:
        return null;
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
        position: 'relative',
      }}
    >
      {/* Go Back Button */}
      <IconButton
        onClick={handleGoBack}
        sx={{
          position: 'absolute',
          top: 20,
          left: 20,
          color: 'rgba(255, 255, 255, 0.8)',
          background: 'rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          '&:hover': {
            background: 'rgba(0, 0, 0, 0.5)',
            color: 'white',
            transform: 'translateX(-2px)',
          },
          transition: 'all 0.3s ease',
        }}
      >
        <ArrowBack />
      </IconButton>

      <Container component="main" maxWidth="sm">
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Paper
            elevation={0}
            sx={{
              padding: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '20px',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            }}
          >
            <Typography 
              component="h1" 
              variant="h4"
              sx={{
                mb: 3,
                background: 'linear-gradient(45deg, #64b5f6, #42a5f5)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 600,
              }}
            >
              Create your 27send Account
            </Typography>

            {/* Stepper */}
            <Stepper 
              activeStep={activeStep} 
              sx={{ 
                width: '100%', 
                mb: 4,
                '& .MuiStepLabel-label': {
                  color: 'rgba(255, 255, 255, 0.7)',
                  '&.Mui-active': {
                    color: '#64b5f6',
                  },
                  '&.Mui-completed': {
                    color: 'rgba(255, 255, 255, 0.9)',
                  },
                },
                '& .MuiStepIcon-root': {
                  color: 'rgba(255, 255, 255, 0.3)',
                  '&.Mui-active': {
                    color: '#64b5f6',
                  },
                  '&.Mui-completed': {
                    color: '#64b5f6',
                  },
                },
              }}
            >
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
              {error && (
                <Alert 
                  severity="error" 
                  sx={{ 
                    mb: 2,
                    background: 'rgba(244, 67, 54, 0.1)',
                    border: '1px solid rgba(244, 67, 54, 0.3)',
                    color: '#ffcdd2',
                    '& .MuiAlert-icon': {
                      color: '#ffcdd2',
                    }
                  }}
                >
                  {error}
                </Alert>
              )}

              {renderStepContent()}

              <Box sx={{ display: 'flex', flexDirection: 'row', pt: 3 }}>
                <Button
                  color="inherit"
                  disabled={activeStep === 0}
                  onClick={handleBack}
                  sx={{ mr: 1, color: 'rgba(255, 255, 255, 0.7)' }}
                  startIcon={<ArrowBack />}
                >
                  Back
                </Button>
                <Box sx={{ flex: '1 1 auto' }} />
                {activeStep === steps.length - 1 ? (
                  <Button
                    type="submit"
                    variant="contained"
                    sx={{
                      background: 'linear-gradient(45deg, #64b5f6, #42a5f5)',
                      borderRadius: '50px',
                      px: 4,
                      py: 1.5,
                      fontSize: '1rem',
                      fontWeight: 600,
                      textTransform: 'none',
                      boxShadow: '0 8px 32px rgba(100, 181, 246, 0.3)',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #42a5f5, #2196f3)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 12px 40px rgba(100, 181, 246, 0.4)',
                      },
                      transition: 'all 0.3s ease',
                    }}
                    disabled={loading}
                  >
                    {loading ? 'Creating Account...' : 'Create Account'}
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    sx={{
                      background: 'linear-gradient(45deg, #64b5f6, #42a5f5)',
                      borderRadius: '50px',
                      px: 4,
                      py: 1.5,
                      fontSize: '1rem',
                      fontWeight: 600,
                      textTransform: 'none',
                      boxShadow: '0 8px 32px rgba(100, 181, 246, 0.3)',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #42a5f5, #2196f3)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 12px 40px rgba(100, 181, 246, 0.4)',
                      },
                      transition: 'all 0.3s ease',
                    }}
                    endIcon={<ArrowForward />}
                  >
                    Next
                  </Button>
                )}
              </Box>

              {activeStep === 0 && (
                <Box sx={{ textAlign: 'center', mt: 3 }}>
                  <Link to="/login" style={{ textDecoration: 'none' }}>
                    <Typography 
                      variant="body2" 
                      sx={{
                        color: '#64b5f6',
                        '&:hover': {
                          color: '#42a5f5',
                          textDecoration: 'underline',
                        },
                        transition: 'color 0.3s ease',
                      }}
                    >
                      Already have an account? Sign In
                    </Typography>
                  </Link>
                </Box>
              )}
            </Box>
          </Paper>
        </Box>
      </Container>
    </Box>
  );
};

export default MultiStepRegister;
