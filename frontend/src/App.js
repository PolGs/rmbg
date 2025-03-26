import React from 'react';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import HomePage from './pages/HomePage';

// Create a custom theme with modern styling
const theme = createTheme({
  palette: {
    primary: {
      main: '#4a6bef',
    },
    secondary: {
      main: '#6c63ff',
    },
    background: {
      default: '#f9f9fb',
    },
  },
  typography: {
    fontFamily: '"Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 600,
    },
    h3: {
      fontWeight: 600,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 20px',
        },
        containedPrimary: {
          background: 'linear-gradient(45deg, #4a6bef 30%, #6c63ff 90%)',
          boxShadow: '0 3px 10px rgba(74, 107, 239, 0.3)',
          '&:hover': {
            boxShadow: '0 5px 15px rgba(74, 107, 239, 0.4)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 12,
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <HomePage />
    </ThemeProvider>
  );
}

export default App; 