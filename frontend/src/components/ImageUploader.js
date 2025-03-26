import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Box, 
  Typography, 
  Paper,
  styled
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

// Styled components
const DropzoneContainer = styled(Paper)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(3),
  border: `2px dashed ${theme.palette.primary.main}`,
  backgroundColor: theme.palette.background.default,
  borderRadius: theme.shape.borderRadius,
  cursor: 'pointer',
  transition: 'border .3s ease-in-out',
  minHeight: 240,
  '&:hover': {
    borderColor: theme.palette.primary.dark,
  },
}));

const PreviewContainer = styled(Box)({
  width: '100%',
  height: '100%',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  position: 'relative',
  overflow: 'hidden',
});

const PreviewImage = styled('img')({
  display: 'block',
  maxWidth: '100%',
  maxHeight: 300,
  width: 'auto',
  height: 'auto',
  objectFit: 'contain',
});

const ImageUploader = ({ onFileDrop, file, previewUrl }) => {
  const onDrop = useCallback((acceptedFiles) => {
    onFileDrop(acceptedFiles);
  }, [onFileDrop]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxSize: 10485760, // 10MB
    multiple: false,
  });

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      {!file ? (
        <DropzoneContainer 
          elevation={0} 
          {...getRootProps()}
          sx={{ 
            borderColor: isDragActive ? 'primary.dark' : 'primary.main',
            backgroundColor: isDragActive ? 'rgba(74, 107, 239, 0.08)' : 'background.default',
          }}
        >
          <input {...getInputProps()} />
          <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          <Typography variant="h6" color="primary" textAlign="center" gutterBottom>
            {isDragActive ? 'Drop the image here' : 'Drag & drop an image here'}
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            or click to select a file
          </Typography>
          <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ mt: 1 }}>
            Supported formats: JPEG, PNG, WebP (max 10MB)
          </Typography>
        </DropzoneContainer>
      ) : (
        <PreviewContainer>
          <PreviewImage src={previewUrl} alt="Preview" />
        </PreviewContainer>
      )}
    </Box>
  );
};

export default ImageUploader; 