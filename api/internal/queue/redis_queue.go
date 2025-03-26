package queue

import (
	"context"
	"encoding/json"
	"time"

	"github.com/go-redis/redis/v8"
)

// JobStatus represents the current status of a processing job
type JobStatus string

const (
	StatusPending   JobStatus = "pending"
	StatusProcessing JobStatus = "processing"
	StatusCompleted JobStatus = "completed"
	StatusFailed    JobStatus = "failed"
)

// Job represents an image processing job
type Job struct {
	ID         string    `json:"id"`
	Status     JobStatus `json:"status"`
	InputPath  string    `json:"input_path"`
	OutputPath string    `json:"output_path,omitempty"`
	Error      string    `json:"error,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// JobQueue defines the interface for job queue operations
type JobQueue interface {
	AddJob(ctx context.Context, job *Job) error
	GetJob(ctx context.Context, jobID string) (*Job, error)
	UpdateJob(ctx context.Context, job *Job) error
	GetPendingJobs(ctx context.Context) ([]*Job, error)
}

// RedisQueue implements JobQueue using Redis
type RedisQueue struct {
	client *redis.Client
}

// NewRedisQueue creates a new Redis-backed job queue
func NewRedisQueue(addr string, db int) (*RedisQueue, error) {
	client := redis.NewClient(&redis.Options{
		Addr: addr,
		DB:   db,
	})

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, err
	}

	return &RedisQueue{
		client: client,
	}, nil
}

// jobKey returns the Redis key for a job
func jobKey(jobID string) string {
	return "job:" + jobID
}

// queueKey returns the Redis key for the pending jobs queue
func queueKey() string {
	return "pending_jobs"
}

// AddJob adds a new job to the queue
func (q *RedisQueue) AddJob(ctx context.Context, job *Job) error {
	// Set current time
	job.CreatedAt = time.Now()
	job.UpdatedAt = job.CreatedAt
	
	// Default status is pending
	if job.Status == "" {
		job.Status = StatusPending
	}
	
	// Serialize job to JSON
	jobJSON, err := json.Marshal(job)
	if err != nil {
		return err
	}
	
	// Store job data
	err = q.client.Set(ctx, jobKey(job.ID), jobJSON, 24*time.Hour).Err()
	if err != nil {
		return err
	}
	
	// Add to pending queue if status is pending
	if job.Status == StatusPending {
		err = q.client.LPush(ctx, queueKey(), job.ID).Err()
		if err != nil {
			return err
		}
	}
	
	return nil
}

// GetJob retrieves a job by ID
func (q *RedisQueue) GetJob(ctx context.Context, jobID string) (*Job, error) {
	jobJSON, err := q.client.Get(ctx, jobKey(jobID)).Bytes()
	if err != nil {
		if err == redis.Nil {
			return nil, nil // Job not found
		}
		return nil, err
	}
	
	var job Job
	if err := json.Unmarshal(jobJSON, &job); err != nil {
		return nil, err
	}
	
	return &job, nil
}

// UpdateJob updates an existing job
func (q *RedisQueue) UpdateJob(ctx context.Context, job *Job) error {
	job.UpdatedAt = time.Now()
	
	jobJSON, err := json.Marshal(job)
	if err != nil {
		return err
	}
	
	return q.client.Set(ctx, jobKey(job.ID), jobJSON, 24*time.Hour).Err()
}

// GetPendingJobs returns pending jobs from the queue
func (q *RedisQueue) GetPendingJobs(ctx context.Context) ([]*Job, error) {
	// Get job IDs from the pending queue
	jobIDs, err := q.client.LRange(ctx, queueKey(), 0, -1).Result()
	if err != nil {
		return nil, err
	}
	
	var jobs []*Job
	for _, jobID := range jobIDs {
		job, err := q.GetJob(ctx, jobID)
		if err != nil {
			continue // Skip jobs with errors
		}
		if job != nil {
			jobs = append(jobs, job)
		}
	}
	
	return jobs, nil
}

// PopPendingJob removes and returns the oldest pending job
func (q *RedisQueue) PopPendingJob(ctx context.Context) (*Job, error) {
	// Pop a job ID from the pending queue
	jobID, err := q.client.RPop(ctx, queueKey()).Result()
	if err != nil {
		if err == redis.Nil {
			return nil, nil // No pending jobs
		}
		return nil, err
	}
	
	return q.GetJob(ctx, jobID)
} 