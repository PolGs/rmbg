import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Button, 
  CircularProgress, 
  Alert,
  Grid,
} from '@mui/material';
import ImageUploader from '../components/ImageUploader';
import ImageProcessor from '../components/ImageProcessor';

const HomePage = () => {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [processingState, setProcessingState] = useState('idle'); // idle, processing, completed, error
  const [jobId, setJobId] = useState(null);
  const [resultUrl, setResultUrl] = useState(null);
  const [error, setError] = useState(null);

  // Reset everything when a new file is uploaded
  useEffect(() => {
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
      setProcessingState('idle');
      setJobId(null);
      setResultUrl(null);
      setError(null);
    }
  }, [file]);

  // Clean up preview URL when component unmounts
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Handle file drop
  const handleFileDrop = (acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  };

  // Clear current file and results
  const handleClear = () => {
    setFile(null);
    setPreviewUrl(null);
    setProcessingState('idle');
    setJobId(null);
    setResultUrl(null);
    setError(null);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ 
        py: 4, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        minHeight: '100vh'
      }}>
        {/* Header */}
        <Typography variant="h2" component="h1" gutterBottom 
          sx={{ 
            fontWeight: 700, 
            textAlign: 'center',
            background: 'linear-gradient(45deg, #4a6bef 30%, #6c63ff 90%)',
            backgroundClip: 'text',
            textFillColor: 'transparent',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 3
          }}>
          Background Removal Tool
        </Typography>

        <Typography variant="h6" color="text.secondary" sx={{ mb: 4, textAlign: 'center' }}>
          Upload an image and our AI will remove the background instantly
        </Typography>

        <Grid container spacing={3}>
          {/* Left Side - Upload */}
          <Grid item xs={12} md={6}>
            <Paper 
              elevation={3} 
              sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}
            >
              <Typography variant="h5" component="h2" gutterBottom>
                Upload Image
              </Typography>
              
              <Box sx={{ flexGrow: 1, my: 2 }}>
                <ImageUploader 
                  onFileDrop={handleFileDrop} 
                  file={file}
                  previewUrl={previewUrl}
                />
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                <Button 
                  variant="outlined" 
                  color="primary" 
                  onClick={handleClear}
                  disabled={!file || processingState === 'processing'}
                >
                  Clear
                </Button>
              </Box>
            </Paper>
          </Grid>

          {/* Right Side - Processing */}
          <Grid item xs={12} md={6}>
            <Paper 
              elevation={3} 
              sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}
            >
              <Typography variant="h5" component="h2" gutterBottom>
                Process Image
              </Typography>
              
              <Box sx={{ flexGrow: 1, my: 2 }}>
                <ImageProcessor 
                  file={file}
                  previewUrl={previewUrl}
                  setProcessingState={setProcessingState}
                  processingState={processingState}
                  setJobId={setJobId}
                  jobId={jobId}
                  setResultUrl={setResultUrl}
                  resultUrl={resultUrl}
                  setError={setError}
                />
              </Box>
              
              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default HomePage; 