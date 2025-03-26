# AI-Powered Background Removal System

A scalable, high-performance, full-stack AI-powered background removal system using Go, Python, and modern frontend technologies. This system handles high-concurrency requests, optimizes resource utilization, and delivers fast, efficient, and responsive image processing.

## Features

- **High-Performance Go API**: RESTful API with goroutines for non-blocking request handling
- **Optimized Python Processing Engine**: Multi-threaded processing using the rembg library
- **Modern React Frontend**: Intuitive UI with drag-and-drop image upload and live processing status
- **Redis-based Job Queue**: Efficient asynchronous background processing
- **Containerized Architecture**: Docker-based deployment with Kubernetes support
- **Scalable Infrastructure**: Load balancing and auto-scaling configuration

## Architecture

The system consists of three main components:

1. **Go API Service**: Handles HTTP requests, manages file uploads, and coordinates with the job queue
2. **Python Processor**: Performs background removal using the rembg library
3. **React Frontend**: Provides a user-friendly interface for image uploading and viewing results

## Prerequisites

- Docker and Docker Compose
- Go 1.20+
- Python 3.10+
- Node.js 18+
- Redis

## Quick Start

### Using Docker Compose

The easiest way to get started is with Docker Compose:

```bash
# Clone the repository
git clone https://github.com/yourusername/rembg-v2.git
cd rembg-v2

# Start the services
docker-compose up -d

# The application will be available at:
# - Frontend: http://localhost
# - API: http://localhost:8080/api
```

### Manual Setup

#### 1. Start Redis

```bash
docker run -d -p 6379:6379 --name redis redis:7-alpine
```

#### 2. Set up the Go API

```bash
cd api
go mod download
go run cmd/main.go
```

#### 3. Set up the Python Processor

```bash
cd processor
pip install -r requirements.txt
python src/worker.py
```

#### 4. Set up the React Frontend

```bash
cd frontend
npm install
npm start
```

## API Endpoints

- **POST /api/process**: Upload an image for background removal
  - Accepts multipart/form-data with an 'image' field
  - Returns a job ID for tracking the processing status

- **GET /api/result?id={jobId}**: Get the status and result of a processing job
  - Returns job status (pending, processing, completed, failed)
  - When completed, includes a URL to download the processed image

## Development

### Directory Structure

```
.
├── api/                    # Go API Service
│   ├── cmd/                # Entry point
│   ├── internal/           # Internal packages
│   │   ├── handlers/       # HTTP handlers
│   │   └── queue/          # Job queue implementation
│   └── config/             # Configuration
│
├── processor/              # Python Processing Service
│   ├── src/                # Source code
│   └── requirements.txt    # Python dependencies
│
├── frontend/               # React Frontend
│   ├── public/             # Static assets
│   └── src/                # React components
│       ├── components/     # Reusable components
│       └── pages/          # Page components
│
├── deployment/             # Deployment configurations
│   ├── docker/             # Docker configuration
│   └── k8s/                # Kubernetes manifests
│
└── .github/                # GitHub Actions workflows
```

## Deployment

### Docker

The project includes Dockerfiles for all services and a docker-compose.yml file for local deployment.

### Kubernetes

Kubernetes manifests are provided in the `deployment/k8s` directory for cloud deployment.

### CI/CD

A GitHub Actions workflow is configured in `.github/workflows/ci-cd.yaml` for continuous integration and deployment.

## Environment Variables

### API Service

- `PORT`: Port to listen on (default: 8080)
- `REDIS_URL`: Redis connection URL (default: localhost:6379)
- `UPLOAD_DIR`: Directory for uploaded images (default: uploads)
- `RESULTS_DIR`: Directory for processed images (default: results)

### Processor Service

- `REDIS_URL`: Redis connection URL (default: localhost:6379)
- `NUM_WORKERS`: Number of worker processes (default: CPU count)
- `RESULTS_DIR`: Directory for processed images (default: results)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [rembg](https://github.com/danielgatis/rembg) for the background removal algorithm
- [Gin](https://github.com/gin-gonic/gin) for the Go web framework
- [React](https://reactjs.org/) for the frontend framework
- [Material-UI](https://mui.com/) for UI components 