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
              height: 64,
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
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
                    fontWeight: 400,
                    fontSize: '22px',
                    letterSpacing: '0.25px',
                    fontFamily: '"Google Sans", "Roboto", "Arial", sans-serif',
                    background: 'linear-gradient(45deg, #64b5f6, #42a5f5)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  27send
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
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '24px', // Changed to circular sides
                      height: 48,
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      },
                      '&.Mui-focused': {
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        boxShadow: '0 1px 1px 0 rgba(0, 0, 0, 0.3), 0 1px 3px 1px rgba(0, 0, 0, 0.15)',
                      },
                    },
                    '& .MuiOutlinedInput-notchedOutline': {
                      border: 'none',
                    },
                    '& .MuiInputBase-input': {
                      fontSize: '16px',
                      '&::placeholder': {
                        color: 'rgba(255, 255, 255, 0.6)',
                        opacity: 1,
                      },
                    },
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ fontSize: 20 }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small">
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
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    }
                  }}
                >
                  <HelpIcon />
                </IconButton>
                <IconButton 
                  size="small" 
                  sx={{ 
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    }
                  }}
                >
                  <SettingsIcon />
                </IconButton>
                <IconButton 
                  size="small" 
                  sx={{ 
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    }
                  }}
                >
                  <Avatar 
                    sx={{ 
                      width: 32, 
                      height: 32,
                      backgroundColor: '#64b5f6',
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
                boxShadow: '0 2px 10px 0 rgba(0, 0, 0, 0.5)',
                borderRadius: '8px',
              }
            }}
          >
            <MenuItem>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1 }}>
                <Avatar sx={{ width: 40, height: 40, backgroundColor: '#64b5f6' }}>
                  {user?.first_name?.[0] || user?.email?.[0] || 'U'}
                </Avatar>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {user?.first_name} {user?.last_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {user?.email}
                  </Typography>
                </Box>
              </Box>
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <IconButton size="small" sx={{ mr: 1 }}>
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