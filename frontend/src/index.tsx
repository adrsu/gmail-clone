import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from 'react-query';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App';
import { store } from './store';

const queryClient = new QueryClient();

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#64b5f6',
      light: '#42a5f5',
      dark: '#2196f3',
    },
    secondary: {
      main: '#34a853',
    },
    background: {
      default: '#0f0f23',
      paper: 'rgba(0, 0, 0, 0.4)',
    },
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255, 255, 255, 0.8)',
    },
    divider: 'rgba(255, 255, 255, 0.1)',
  },
  typography: {
    fontFamily: '"Google Sans", "Roboto", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      background: 'linear-gradient(45deg, #64b5f6, #42a5f5, #2196f3)',
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
    h2: {
      fontWeight: 600,
      background: 'linear-gradient(45deg, #64b5f6, #42a5f5)',
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
    h3: {
      fontWeight: 600,
      color: '#ffffff',
    },
    h4: {
      fontWeight: 600,
      background: 'linear-gradient(45deg, #64b5f6, #42a5f5)',
      backgroundClip: 'text',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
    h5: {
      fontWeight: 300,
      color: 'rgba(255, 255, 255, 0.8)',
    },
    h6: {
      fontWeight: 400,
      color: '#ffffff',
    },
    body1: {
      fontSize: '14px',
      color: '#ffffff',
    },
    body2: {
      fontSize: '13px',
      color: 'rgba(255, 255, 255, 0.7)',
    },
    caption: {
      fontSize: '12px',
      color: 'rgba(255, 255, 255, 0.6)',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          margin: 0,
          padding: 0,
          fontFamily: '"Google Sans", "Roboto", "Arial", sans-serif',
          backgroundColor: '#0f0f23',
          color: '#ffffff',
          background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
          minHeight: '100vh',
        },
        '*': {
          boxSizing: 'border-box',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: '50px',
          fontWeight: 600,
          transition: 'all 0.3s ease',
        },
        contained: {
          background: 'linear-gradient(45deg, #64b5f6, #42a5f5)',
          boxShadow: '0 8px 32px rgba(100, 181, 246, 0.3)',
          '&:hover': {
            background: 'linear-gradient(45deg, #42a5f5, #2196f3)',
            transform: 'translateY(-2px)',
            boxShadow: '0 12px 40px rgba(100, 181, 246, 0.4)',
          },
        },
        outlined: {
          borderColor: 'rgba(255, 255, 255, 0.3)',
          color: '#ffffff',
          background: 'rgba(0, 0, 0, 0.2)',
          backdropFilter: 'blur(10px)',
          '&:hover': {
            borderColor: '#ffffff',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 32px rgba(255, 255, 255, 0.1)',
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: '50%',
          color: 'rgba(255, 255, 255, 0.8)',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: '#ffffff',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          background: 'rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: 'rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-8px)',
            background: 'rgba(0, 0, 0, 0.5)',
            borderColor: 'rgba(100, 181, 246, 0.5)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.7)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            color: '#ffffff',
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
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'rgba(0, 0, 0, 0.4)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.3), 0 1px 3px 1px rgba(0, 0, 0, 0.15)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: 'rgba(0, 0, 0, 0.4)',
          borderRight: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
        },
      },
    },
    MuiList: {
      styleOverrides: {
        root: {
          '& .MuiListItemButton-root': {
            color: 'rgba(255, 255, 255, 0.8)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
            '&.Mui-selected': {
              backgroundColor: 'rgba(100, 181, 246, 0.2)',
              color: '#ffffff',
              '&:hover': {
                backgroundColor: 'rgba(100, 181, 246, 0.3)',
              },
            },
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          background: 'rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
        },
      },
    },
  },
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <App />
          </ThemeProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  </React.StrictMode>
); 