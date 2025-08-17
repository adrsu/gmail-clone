import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Container, 
  Grid, 
  Card, 
  CardContent,
  useTheme,
  useMediaQuery,
  Fade,
  Slide,
  Grow
} from '@mui/material';
import { 
  Email, 
  Security, 
  Speed, 
  Storage,
  ArrowForward,
  PlayArrow
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const LandingPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(true);
    // Force dark theme styles
    document.body.style.backgroundColor = '#0f0f23';
    document.body.style.color = 'white';
    
    return () => {
      // Cleanup on unmount
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
    };
  }, []);

     const features = [
     {
       icon: <Email sx={{ fontSize: 40, color: '#64b5f6' }} />,
       title: 'Smart Email Management',
       description: 'AI-powered organization and intelligent categorization of your emails'
     },
     {
       icon: <Security sx={{ fontSize: 40, color: '#64b5f6' }} />,
       title: 'Enterprise Security',
       description: 'End-to-end encryption and advanced security protocols'
     },
     {
       icon: <Speed sx={{ fontSize: 40, color: '#64b5f6' }} />,
       title: 'Lightning Fast',
       description: 'Optimized performance with instant search and real-time sync'
     },
     {
       icon: <Storage sx={{ fontSize: 40, color: '#64b5f6' }} />,
       title: 'Unlimited Storage',
       description: 'Never worry about running out of space for your emails'
     }
   ];

  const handleGetStarted = () => {
    navigate('/register');
  };

  const handleLearnMore = () => {
    // Scroll to features section
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
         <Box sx={{ 
       minHeight: '100vh', 
       background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
       color: 'white',
       position: 'relative',
       zIndex: 1,
       '& *': {
         color: 'inherit'
       }
     }}>
      {/* Hero Section */}
      <Container maxWidth="lg" sx={{ pt: 8, pb: 4 }}>
        <Grid container spacing={4} alignItems="center" sx={{ minHeight: '80vh' }}>
          <Grid item xs={12} md={6}>
            <Fade in={animate} timeout={1000}>
              <Box>
                                 <Typography 
                   variant="h1" 
                   sx={{ 
                     fontSize: isMobile ? '3rem' : '4.5rem',
                     fontWeight: 700,
                     background: 'linear-gradient(45deg, #64b5f6, #42a5f5, #2196f3)',
                     backgroundClip: 'text',
                     WebkitBackgroundClip: 'text',
                     WebkitTextFillColor: 'transparent',
                     mb: 2,
                     lineHeight: 1.1
                   }}
                 >
                   The Future of
                   <br />
                   Email
                 </Typography>
                 <Typography 
                   variant="h5" 
                   sx={{ 
                     color: 'rgba(255, 255, 255, 0.8)',
                     mb: 4,
                     fontWeight: 300,
                     lineHeight: 1.5
                   }}
                 >
                   Experience the next generation of email communication with AI-powered features, 
                   enterprise security, and seamless collaboration.
                 </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleGetStarted}
                    sx={{
                                           background: 'linear-gradient(45deg, #64b5f6, #42a5f5)',
                     borderRadius: '50px',
                     px: 4,
                     py: 1.5,
                     fontSize: '1.1rem',
                     fontWeight: 600,
                     textTransform: 'none',
                     boxShadow: '0 8px 32px rgba(100, 181, 246, 0.3)',
                     '&:hover': {
                       background: 'linear-gradient(45deg, #42a5f5, #2196f3)',
                       transform: 'translateY(-2px)',
                       boxShadow: '0 12px 40px rgba(100, 181, 246, 0.4)',
                     },
                      transition: 'all 0.3s ease'
                    }}
                  >
                    Get Started
                    <ArrowForward sx={{ ml: 1 }} />
                  </Button>
                                     <Button
                     variant="outlined"
                     size="large"
                     onClick={handleLearnMore}
                     sx={{
                       borderColor: 'rgba(255, 255, 255, 0.3)',
                       color: 'white',
                       borderRadius: '50px',
                       px: 4,
                       py: 1.5,
                       fontSize: '1.1rem',
                       fontWeight: 600,
                       textTransform: 'none',
                       background: 'rgba(0, 0, 0, 0.2)',
                       backdropFilter: 'blur(10px)',
                       '&:hover': {
                         borderColor: 'white',
                         backgroundColor: 'rgba(255, 255, 255, 0.1)',
                         transform: 'translateY(-2px)',
                         boxShadow: '0 8px 32px rgba(255, 255, 255, 0.1)',
                       },
                       transition: 'all 0.3s ease'
                     }}
                   >
                     <PlayArrow sx={{ mr: 1 }} />
                     Learn More
                   </Button>
                </Box>
              </Box>
            </Fade>
          </Grid>
          <Grid item xs={12} md={6}>
            <Slide direction="left" in={animate} timeout={1200}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center',
                position: 'relative'
              }}>
                                 <Box sx={{
                   width: 400,
                   height: 300,
                   background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.4), rgba(100, 181, 246, 0.1))',
                   borderRadius: '20px',
                   border: '1px solid rgba(255, 255, 255, 0.1)',
                   backdropFilter: 'blur(10px)',
                   display: 'flex',
                   alignItems: 'center',
                   justifyContent: 'center',
                   position: 'relative',
                   overflow: 'hidden',
                   boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
                 }}>
                   <Email sx={{ 
                     fontSize: 120, 
                     color: '#64b5f6',
                     '@keyframes float': {
                       '0%, 100%': { transform: 'translateY(0px)' },
                       '50%': { transform: 'translateY(-20px)' }
                     },
                     animation: 'float 6s ease-in-out infinite'
                   }} />
                   <Box sx={{
                     position: 'absolute',
                     top: '50%',
                     left: '50%',
                     transform: 'translate(-50%, -50%)',
                     width: '200%',
                     height: '200%',
                     background: 'conic-gradient(from 0deg, transparent, rgba(100, 181, 246, 0.2), transparent)',
                     '@keyframes rotate': {
                       from: { transform: 'translate(-50%, -50%) rotate(0deg)' },
                       to: { transform: 'translate(-50%, -50%) rotate(360deg)' }
                     },
                     animation: 'rotate 10s linear infinite'
                   }} />
                 </Box>
              </Box>
            </Slide>
          </Grid>
        </Grid>
      </Container>

             {/* Features Section */}
       <Box id="features" sx={{ 
         py: 8, 
         background: 'rgba(0, 0, 0, 0.2)',
         position: 'relative',
         zIndex: 1
       }}>
        <Container maxWidth="lg">
          <Grow in={animate} timeout={1500}>
            <Box sx={{ textAlign: 'center', mb: 6 }}>
                             <Typography 
                 variant="h2" 
                 sx={{ 
                   fontSize: isMobile ? '2.5rem' : '3.5rem',
                   fontWeight: 600,
                   mb: 2,
                   background: 'linear-gradient(45deg, #64b5f6, #42a5f5)',
                   backgroundClip: 'text',
                   WebkitBackgroundClip: 'text',
                   WebkitTextFillColor: 'transparent'
                 }}
               >
                 Why Choose Us
               </Typography>
               <Typography 
                 variant="h6" 
                 sx={{ 
                   color: 'rgba(255, 255, 255, 0.7)',
                   maxWidth: 600,
                   mx: 'auto',
                   fontWeight: 300
                 }}
               >
                 Built with cutting-edge technology to deliver an unparalleled email experience
               </Typography>
            </Box>
          </Grow>
          
          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Grow in={animate} timeout={1500 + index * 200}>
                                     <Card sx={{
                     background: 'rgba(0, 0, 0, 0.3)',
                     border: '1px solid rgba(255, 255, 255, 0.1)',
                     borderRadius: '16px',
                     backdropFilter: 'blur(10px)',
                     height: '100%',
                     transition: 'all 0.3s ease',
                     boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
                     '&:hover': {
                       transform: 'translateY(-8px)',
                       background: 'rgba(0, 0, 0, 0.5)',
                       borderColor: 'rgba(100, 181, 246, 0.5)',
                       boxShadow: '0 20px 40px rgba(0, 0, 0, 0.7)'
                     }
                   }}>
                     <CardContent sx={{ textAlign: 'center', p: 3 }}>
                       <Box sx={{ mb: 2 }}>
                         {feature.icon}
                       </Box>
                       <Typography 
                         variant="h6" 
                         sx={{ 
                           fontWeight: 600, 
                           mb: 1,
                           color: 'white'
                         }}
                       >
                         {feature.title}
                       </Typography>
                       <Typography 
                         variant="body2" 
                         sx={{ 
                           color: 'rgba(255, 255, 255, 0.7)',
                           lineHeight: 1.6
                         }}
                       >
                         {feature.description}
                       </Typography>
                     </CardContent>
                   </Card>
                </Grow>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

             {/* CTA Section */}
       <Box sx={{ 
         py: 8,
         position: 'relative',
         zIndex: 1
       }}>
        <Container maxWidth="md">
          <Grow in={animate} timeout={2000}>
                         <Box sx={{ 
               textAlign: 'center',
               background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.4), rgba(100, 181, 246, 0.1))',
               borderRadius: '24px',
               border: '1px solid rgba(255, 255, 255, 0.1)',
               p: 6,
               backdropFilter: 'blur(10px)',
               boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
             }}>
               <Typography 
                 variant="h3" 
                 sx={{ 
                   fontWeight: 600, 
                   mb: 2,
                   color: 'white'
                 }}
               >
                 Ready to Transform Your Email Experience?
               </Typography>
               <Typography 
                 variant="h6" 
                 sx={{ 
                   color: 'rgba(255, 255, 255, 0.8)',
                   mb: 4,
                   fontWeight: 300
                 }}
               >
                 Join thousands of users who have already upgraded their email workflow
               </Typography>
              <Button
                variant="contained"
                size="large"
                onClick={handleGetStarted}
                sx={{
                                   background: 'linear-gradient(45deg, #64b5f6, #42a5f5)',
                 borderRadius: '50px',
                 px: 6,
                 py: 2,
                 fontSize: '1.2rem',
                 fontWeight: 600,
                 textTransform: 'none',
                 boxShadow: '0 8px 32px rgba(100, 181, 246, 0.3)',
                 '&:hover': {
                   background: 'linear-gradient(45deg, #42a5f5, #2196f3)',
                   transform: 'translateY(-2px)',
                   boxShadow: '0 12px 40px rgba(100, 181, 246, 0.4)',
                 },
                  transition: 'all 0.3s ease'
                }}
              >
                Start Your Free Trial
                <ArrowForward sx={{ ml: 1 }} />
              </Button>
            </Box>
          </Grow>
        </Container>
      </Box>

             {/* Footer */}
       <Box sx={{ 
         py: 4, 
         borderTop: '1px solid rgba(255, 255, 255, 0.1)',
         textAlign: 'center',
         background: 'rgba(0, 0, 0, 0.3)'
       }}>
         <Container maxWidth="lg">
           <Typography 
             variant="body2" 
             sx={{ 
               color: 'rgba(255, 255, 255, 0.6)',
               fontWeight: 300
             }}
           >
             Made with ❤️ by 27send © 2025
           </Typography>
         </Container>
       </Box>


    </Box>
  );
};

export default LandingPage;
