import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  CircularProgress, 
  styled
} from '@mui/material';
import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider';
import axios from 'axios';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';

// Polling interval in ms
const POLLING_INTERVAL = 2000;

// Styled components
const ProcessingContainer = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  height: '100%',
  minHeight: 240,
});

const ComparisonContainer = styled(Box)({
  width: '100%',
  maxWidth: '100%',
  maxHeight: 300,
  overflow: 'hidden',
});

const ImageProcessor = ({ 
  file, 
  previewUrl, 
  processingState, 
  setProcessingState, 
  jobId, 
  setJobId, 
  resultUrl, 
  setResultUrl, 
  setError 
}) => {
  const [progress, setProgress] = useState(0);
  const [pollingTimeout, setPollingTimeout] = useState(null);

  // Process the image when the user clicks the process button
  const handleProcess = async () => {
    if (!file) return;

    setProcessingState('processing');
    setProgress(0);
    
    try {
      // Create form data for the image
      const formData = new FormData();
      formData.append('image', file);
      
      // Upload the image and start processing
      const response = await axios.post('/api/process', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Get the job ID from the response
      if (response.data && response.data.job_id) {
        setJobId(response.data.job_id);
        // Start polling for results
        pollForResults(response.data.job_id);
      } else {
        throw new Error('No job ID returned from server');
      }
    } catch (err) {
      console.error('Error processing image:', err);
      setProcessingState('error');
      setError(err.response?.data?.error || 'Failed to process image');
    }
  };

  // Poll for job results
  const pollForResults = useCallback((currentJobId) => {
    const poll = async () => {
      try {
        const response = await axios.get(`/api/result?id=${currentJobId}`);
        
        if (response.data) {
          const { status, result_url, error } = response.data;
          
          // Update progress based on status
          if (status === 'processing') {
            setProgress((prev) => Math.min(prev + 10, 80));
          }
          
          // Handle different job statuses
          if (status === 'completed' && result_url) {
            // Job completed successfully
            setProcessingState('completed');
            setProgress(100);
            setResultUrl(result_url);
            return; // Stop polling
          } else if (status === 'failed') {
            // Job failed
            setProcessingState('error');
            setError(error || 'Processing failed');
            return; // Stop polling
          } else if (status === 'pending') {
            // Job still pending
            setProgress((prev) => Math.min(prev, 30));
          }
        }
        
        // Continue polling
        const timeout = setTimeout(() => poll(), POLLING_INTERVAL);
        setPollingTimeout(timeout);
      } catch (err) {
        console.error('Error polling for results:', err);
        setProcessingState('error');
        setError(err.response?.data?.error || 'Failed to get processing status');
      }
    };
    
    // Start polling immediately
    poll();
    
    // Cleanup function to clear timeout
    return () => {
      if (pollingTimeout) {
        clearTimeout(pollingTimeout);
      }
    };
  }, [setProcessingState, setError, setResultUrl, pollingTimeout]);

  // Cleanup polling when component unmounts
  useEffect(() => {
    return () => {
      if (pollingTimeout) {
        clearTimeout(pollingTimeout);
      }
    };
  }, [pollingTimeout]);

  // Function to download the processed image
  const handleDownload = () => {
    if (resultUrl) {
      // Create a temporary link element and trigger download
      const downloadLink = document.createElement('a');
      downloadLink.href = resultUrl;
      downloadLink.download = `processed-${file.name}`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  // Handle try again button click
  const handleTryAgain = () => {
    if (pollingTimeout) {
      clearTimeout(pollingTimeout);
    }
    setProcessingState('idle');
    setProgress(0);
    setError(null);
  };

  return (
    <ProcessingContainer>
      {!file ? (
        <Typography color="text.secondary" textAlign="center">
          Upload an image to get started
        </Typography>
      ) : processingState === 'idle' ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Button 
            variant="contained" 
            color="primary" 
            size="large" 
            onClick={handleProcess}
            sx={{ mb: 2 }}
          >
            Remove Background
          </Button>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Click to process the uploaded image
          </Typography>
        </Box>
      ) : processingState === 'processing' ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <CircularProgress 
            variant="determinate" 
            value={progress} 
            size={60} 
            thickness={4} 
            sx={{ mb: 2 }} 
          />
          <Typography variant="body1" color="text.primary" textAlign="center" gutterBottom>
            Processing your image...
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            This may take a few moments
          </Typography>
        </Box>
      ) : processingState === 'completed' ? (
        <Box sx={{ width: '100%' }}>
          <ComparisonContainer>
            <ReactCompareSlider
              itemOne={<ReactCompareSliderImage src={previewUrl} alt="Original" />}
              itemTwo={<ReactCompareSliderImage src={resultUrl} alt="Processed" />}
              position={50}
              style={{ height: '300px' }}
            />
          </ComparisonContainer>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
            <Button 
              variant="outlined" 
              color="primary"
              startIcon={<RefreshIcon />}
              onClick={handleTryAgain}
            >
              Process Again
            </Button>
            <Button 
              variant="contained" 
              color="primary"
              startIcon={<DownloadIcon />}
              onClick={handleDownload}
            >
              Download Result
            </Button>
          </Box>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography variant="body1" color="error" textAlign="center" gutterBottom>
            Processing failed
          </Typography>
          <Button 
            variant="outlined" 
            color="primary"
            onClick={handleTryAgain}
            sx={{ mt: 2 }}
          >
            Try Again
          </Button>
        </Box>
      )}
    </ProcessingContainer>
  );
};

export default ImageProcessor; 