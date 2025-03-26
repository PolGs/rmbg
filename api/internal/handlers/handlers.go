package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"

	"rembg-v2/api/internal/queue"
)

// Handler contains the handlers for the API endpoints
type Handler struct {
	jobQueue   queue.JobQueue
	uploadDir  string
	resultsDir string
}

// NewHandler creates a new Handler with the given dependencies
func NewHandler(jobQueue queue.JobQueue) *Handler {
	// Create upload and results directories if they don't exist
	uploadDir := getEnv("UPLOAD_DIR", "uploads")
	resultsDir := getEnv("RESULTS_DIR", "results")

	os.MkdirAll(uploadDir, 0755)
	os.MkdirAll(resultsDir, 0755)

	return &Handler{
		jobQueue:   jobQueue,
		uploadDir:  uploadDir,
		resultsDir: resultsDir,
	}
}

// ProcessImage handles the image upload and creates a new processing job
func (h *Handler) ProcessImage(c *gin.Context) {
	// Get the uploaded file
	file, err := c.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No image provided"})
		return
	}

	// Generate a unique job ID
	jobID, err := generateID()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate job ID"})
		return
	}

	// Create a filename with the job ID
	filename := jobID + filepath.Ext(file.Filename)
	uploadPath := filepath.Join(h.uploadDir, filename)

	// Save the uploaded file
	if err := c.SaveUploadedFile(file, uploadPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save the uploaded file"})
		return
	}

	// Create a new job
	job := &queue.Job{
		ID:        jobID,
		Status:    queue.StatusPending,
		InputPath: uploadPath,
	}

	// Add the job to the queue
	if err := h.jobQueue.AddJob(c.Request.Context(), job); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add job to queue"})
		return
	}

	// Return the job ID to the client
	c.JSON(http.StatusAccepted, gin.H{
		"job_id": jobID,
		"status": string(job.Status),
	})
}

// GetResult handles retrieving the result of a processing job
func (h *Handler) GetResult(c *gin.Context) {
	// Get the job ID from the query parameters
	jobID := c.Query("id")
	if jobID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Job ID is required"})
		return
	}

	// Get the job from the queue
	job, err := h.jobQueue.GetJob(c.Request.Context(), jobID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve job"})
		return
	}

	// Check if the job exists
	if job == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Job not found"})
		return
	}

	// Return job info
	result := gin.H{
		"job_id": job.ID,
		"status": string(job.Status),
	}

	// Add additional info based on job status
	switch job.Status {
	case queue.StatusCompleted:
		// Serve the processed image directly if it exists
		if _, err := os.Stat(job.OutputPath); err == nil {
			result["result_url"] = fmt.Sprintf("/api/download/%s", job.ID)
			result["completed_at"] = job.UpdatedAt.Format(time.RFC3339)
		} else {
			result["error"] = "Result file not found"
		}
	case queue.StatusFailed:
		result["error"] = job.Error
	case queue.StatusProcessing:
		result["started_at"] = job.UpdatedAt.Format(time.RFC3339)
	}

	c.JSON(http.StatusOK, result)
}

// DownloadResult serves the processed image file
func (h *Handler) DownloadResult(c *gin.Context) {
	// Get the job ID from the URL parameter
	jobID := c.Param("id")
	if jobID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Job ID is required"})
		return
	}

	// Get the job from the queue
	job, err := h.jobQueue.GetJob(c.Request.Context(), jobID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve job"})
		return
	}

	// Check if the job exists and is completed
	if job == nil || job.Status != queue.StatusCompleted || job.OutputPath == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "Result not available"})
		return
	}

	// Serve the file
	c.File(job.OutputPath)
}

// generateID generates a random ID for a job
func generateID() (string, error) {
	b := make([]byte, 8)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// getEnv returns the environment variable value or a default if not set
func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
} 