#!/usr/bin/env python3
"""
Background removal worker process using rembg.
This worker polls the Redis queue for pending jobs and processes them.
"""

import json
import logging
import multiprocessing
import os
import sys
import time
import traceback
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Dict, Any, List

import redis
from rembg import remove, new_session
from PIL import Image
import numpy as np


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("rembg-worker")


@dataclass
class Job:
    """Represents a background removal job."""
    id: str
    status: str
    input_path: str
    output_path: Optional[str] = None
    error: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class RedisJobQueue:
    """Redis-based job queue implementation."""
    
    def __init__(self, redis_url: str = "localhost:6379", db: int = 0):
        """Initialize the Redis connection."""
        self.redis = redis.Redis.from_url(f"redis://{redis_url}/{db}", decode_responses=True)
        self.pending_queue = "pending_jobs"
    
    def job_key(self, job_id: str) -> str:
        """Returns the Redis key for a job."""
        return f"job:{job_id}"
    
    def get_job(self, job_id: str) -> Optional[Job]:
        """Get a job by its ID."""
        job_data = self.redis.get(self.job_key(job_id))
        if not job_data:
            return None
        
        try:
            job_dict = json.loads(job_data)
            return Job(
                id=job_dict["id"],
                status=job_dict["status"],
                input_path=job_dict["input_path"],
                output_path=job_dict.get("output_path"),
                error=job_dict.get("error"),
                created_at=job_dict.get("created_at"),
                updated_at=job_dict.get("updated_at")
            )
        except Exception as e:
            logger.error(f"Error parsing job data: {e}")
            return None
    
    def update_job(self, job: Job) -> None:
        """Update a job's status in Redis."""
        job_dict = {
            "id": job.id,
            "status": job.status,
            "input_path": job.input_path,
            "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }
        
        if job.output_path:
            job_dict["output_path"] = job.output_path
        
        if job.error:
            job_dict["error"] = job.error
        
        self.redis.set(
            self.job_key(job.id),
            json.dumps(job_dict),
            ex=86400  # 24 hours expiry
        )
    
    def get_pending_job(self) -> Optional[Job]:
        """Get the next pending job from the queue."""
        # Get a job ID from the pending jobs queue
        job_id = self.redis.rpop(self.pending_queue)
        if not job_id:
            return None
        
        return self.get_job(job_id)


class ImageProcessor:
    """Handles the background removal processing."""
    
    def __init__(self, model_name: str = "u2net"):
        """Initialize the processor with the specified model."""
        self.model_name = model_name
        self.session = new_session(model_name)
        
    def process_image(self, input_path: str, output_path: str) -> bool:
        """Process an image to remove its background."""
        try:
            # Read input image
            input_image = Image.open(input_path)
            
            # Process image using rembg
            output_data = remove(
                input_image,
                session=self.session,
                alpha_matting=True,
                alpha_matting_foreground_threshold=240,
                alpha_matting_background_threshold=10,
                alpha_matting_erode_size=10
            )
            
            # Save processed image
            output_data.save(output_path)
            return True
        except Exception as e:
            logger.error(f"Error processing image: {str(e)}")
            traceback.print_exc()
            return False


def worker_process(worker_id: int, redis_url: str, results_dir: str):
    """Worker process function that processes jobs from the queue."""
    logger.info(f"Worker {worker_id} started")
    
    # Initialize the job queue and image processor
    job_queue = RedisJobQueue(redis_url)
    processor = ImageProcessor()
    
    while True:
        try:
            # Get a pending job
            job = job_queue.get_pending_job()
            if not job:
                # No job available, sleep before trying again
                time.sleep(1)
                continue
            
            logger.info(f"Worker {worker_id} processing job {job.id}")
            
            # Update job status to processing
            job.status = "processing"
            job_queue.update_job(job)
            
            # Create output path
            input_path = Path(job.input_path)
            output_filename = f"{job.id}-output{input_path.suffix}"
            output_path = str(Path(results_dir) / output_filename)
            
            # Ensure results directory exists
            os.makedirs(results_dir, exist_ok=True)
            
            # Process the image
            success = processor.process_image(job.input_path, output_path)
            
            if success:
                # Update job status to completed
                job.status = "completed"
                job.output_path = output_path
            else:
                # Update job status to failed
                job.status = "failed"
                job.error = "Failed to process image"
            
            job_queue.update_job(job)
            logger.info(f"Worker {worker_id} completed job {job.id} with status {job.status}")
            
        except Exception as e:
            logger.error(f"Worker {worker_id} error: {str(e)}")
            traceback.print_exc()
            time.sleep(5)  # Sleep to avoid tight error loop


def main():
    """Main entry point for the worker pool."""
    # Get environment variables
    redis_url = os.environ.get("REDIS_URL", "localhost:6379")
    num_workers = int(os.environ.get("NUM_WORKERS", multiprocessing.cpu_count()))
    results_dir = os.environ.get("RESULTS_DIR", "results")
    
    logger.info(f"Starting {num_workers} workers")
    
    # Create worker processes
    processes = []
    for i in range(num_workers):
        p = multiprocessing.Process(
            target=worker_process,
            args=(i, redis_url, results_dir)
        )
        p.daemon = True
        p.start()
        processes.append(p)
    
    try:
        # Wait for all processes to finish (they won't)
        for p in processes:
            p.join()
    except KeyboardInterrupt:
        logger.info("Shutting down workers")
        for p in processes:
            p.terminate()
        sys.exit(0)


if __name__ == "__main__":
    main() 