import React, { useState, createContext, useContext } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  TextField,
  InputAdornment,
  Badge,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Search as SearchIcon,
  Tune as TuneIcon,
  HelpOutline as HelpIcon,
  Settings as SettingsIcon,
  Apps as AppsIcon,
  AccountCircle as AccountIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { RootState } from '../../store';
import { logout } from '../../store/slices/authSlice';

// Create context for sidebar state
interface SidebarContextType {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const SidebarContext = createContext<SidebarContextType>({
  sidebarCollapsed: false,
  setSidebarCollapsed: () => {},
});

export const useSidebar = () => useContext(SidebarContext);

// Add SearchContext
interface SearchContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    dispatch(logout());
    handleProfileMenuClose();
  };

  const handleSidebarToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <SidebarContext.Provider value={{ sidebarCollapsed, setSidebarCollapsed }}>
      <SearchContext.Provider value={{ searchQuery, setSearchQuery }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
          {/* Gmail-style Top Bar */}
          <AppBar 
            position="static" 
            sx={{ 
              backgroundColor: '#fff', 
              color: '#5f6368',
              boxShadow: '0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15)',
              height: 64,
              borderBottom: '1px solid #e8eaed'
            }}
          >
            <Toolbar sx={{ minHeight: '64px !important', px: 2, gap: 1 }}>
              {/* Hamburger Menu */}
              <IconButton
                color="inherit"
                aria-label="toggle sidebar"
                edge="start"
                onClick={handleSidebarToggle}
                sx={{ 
                  mr: 1,
                  color: '#5f6368',
                  '&:hover': {
                    backgroundColor: '#f1f3f4',
                  }
                }}
              >
                <MenuIcon />
              </IconButton>

              {/* Gmail Logo */}
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 3 }}>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    color: '#5f6368', 
                    fontWeight: 400,
                    fontSize: '22px',
                    letterSpacing: '0.25px',
                    fontFamily: '"Google Sans", "Roboto", "Arial", sans-serif'
                  }}
                >
                  Gmail Clone
                </Typography>
              </Box>

              {/* Search Bar */}
              <Box sx={{ 
                flexGrow: 1, 
                maxWidth: 720, 
                mx: 'auto',
                display: 'flex',
                // justifyContent: 'center',
                marginLeft: '30px',
              }}>
                <TextField
                  fullWidth
                  placeholder="Search mail"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#f1f3f4',
                      borderRadius: '24px', // Changed to circular sides
                      height: 48,
                      '&:hover': {
                        backgroundColor: '#e8eaed',
                      },
                      '&.Mui-focused': {
                        backgroundColor: '#fff',
                        boxShadow: '0 1px 1px 0 rgba(65,69,73,0.3), 0 1px 3px 1px rgba(65,69,73,0.15)',
                      },
                    },
                    '& .MuiOutlinedInput-notchedOutline': {
                      border: 'none',
                    },
                    '& .MuiInputBase-input': {
                      fontSize: '16px',
                      color: '#202124',
                      '&::placeholder': {
                        color: '#5f6368',
                        opacity: 1,
                      },
                    },
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: '#5f6368', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" sx={{ color: '#5f6368' }}>
                          <TuneIcon sx={{ fontSize: 20 }} />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              {/* Right side icons */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 2 }}>
                <IconButton 
                  size="small" 
                  sx={{ 
                    color: '#5f6368',
                    '&:hover': {
                      backgroundColor: '#f1f3f4',
                    }
                  }}
                >
                  <HelpIcon />
                </IconButton>
                <IconButton 
                  size="small" 
                  sx={{ 
                    color: '#5f6368',
                    '&:hover': {
                      backgroundColor: '#f1f3f4',
                    }
                  }}
                >
                  <SettingsIcon />
                </IconButton>
                <IconButton 
                  size="small" 
                  sx={{ 
                    color: '#5f6368',
                    '&:hover': {
                      backgroundColor: '#f1f3f4',
                    }
                  }}
                >
                  <AppsIcon />
                </IconButton>
                <IconButton
                  size="large"
                  edge="end"
                  aria-label="account of current user"
                  aria-controls="primary-search-account-menu"
                  aria-haspopup="true"
                  onClick={handleProfileMenuOpen}
                  sx={{ 
                    color: '#5f6368',
                    '&:hover': {
                      backgroundColor: '#f1f3f4',
                    }
                  }}
                >
                  <Avatar 
                    sx={{ 
                      width: 32, 
                      height: 32,
                      backgroundColor: '#1a73e8',
                      fontSize: '14px',
                      fontWeight: 500,
                      fontFamily: '"Google Sans", "Roboto", "Arial", sans-serif'
                    }}
                  >
                    {user?.first_name?.[0] || user?.email?.[0] || 'U'}
                  </Avatar>
                </IconButton>
              </Box>
            </Toolbar>
          </AppBar>

          {/* Profile Menu */}
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
            onClick={handleProfileMenuClose}
            PaperProps={{
              sx: {
                mt: 1,
                minWidth: 200,
                boxShadow: '0 2px 10px 0 rgba(70,70,70,0.2)',
                borderRadius: '8px',
              }
            }}
          >
            <MenuItem>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1 }}>
                <Avatar sx={{ width: 40, height: 40, backgroundColor: '#1a73e8' }}>
                  {user?.first_name?.[0] || user?.email?.[0] || 'U'}
                </Avatar>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: '#202124' }}>
                    {user?.first_name} {user?.last_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {user?.email}
                  </Typography>
                </Box>
              </Box>
            </MenuItem>
            <MenuItem onClick={handleLogout} sx={{ color: '#5f6368' }}>
              <IconButton size="small" sx={{ mr: 1, color: '#5f6368' }}>
                <LogoutIcon fontSize="small" />
              </IconButton>
              Sign out
            </MenuItem>
          </Menu>

          {/* Main Content */}
          <Box sx={{ flexGrow: 1, display: 'flex' }}>
            {children}
          </Box>
        </Box>
      </SearchContext.Provider>
    </SidebarContext.Provider>
  );
};

export default Layout; 