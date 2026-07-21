from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path

import structlog

from app.core.storage import get_storage_backend
from app.db.session_sync import sync_session_scope
from app.db.models.analysis_job import AnalysisJob

logger = structlog.get_logger()


def cleanup_old_jobs(days_to_keep: int = 30) -> None:
    """Delete jobs older than specified days and their associated files."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days_to_keep)
    
    with sync_session_scope() as session:
        old_jobs = session.query(AnalysisJob).filter(
            AnalysisJob.updated_at < cutoff,
            AnalysisJob.status.in_(["done", "error"])
        ).all()
        
        if not old_jobs:
            logger.info("cleanup_no_jobs", days=days_to_keep)
            return
        
        storage = get_storage_backend()
        deleted_count = 0
        
        for job in old_jobs:
            try:
                # Delete files from storage
                job_dir = storage.job_dir(job.id)
                if job_dir.exists():
                    for file in job_dir.iterdir():
                        file.unlink()
                    job_dir.rmdir()
                
                # Delete database record
                session.delete(job)
                deleted_count += 1
                logger.info("cleanup_job_deleted", job_id=job.id, filename=job.original_filename)
            except Exception as e:
                logger.error("cleanup_job_failed", job_id=job.id, error=str(e))
        
        session.commit()
        logger.info("cleanup_completed", deleted=deleted_count, total=len(old_jobs))


def cleanup_failed_jobs(hours_to_keep: int = 24) -> None:
    """Delete failed jobs older than specified hours."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours_to_keep)
    
    with sync_session_scope() as session:
        failed_jobs = session.query(AnalysisJob).filter(
            AnalysisJob.updated_at < cutoff,
            AnalysisJob.status == "error"
        ).all()
        
        if not failed_jobs:
            logger.info("cleanup_no_failed_jobs", hours=hours_to_keep)
            return
        
        storage = get_storage_backend()
        deleted_count = 0
        
        for job in failed_jobs:
            try:
                job_dir = storage.job_dir(job.id)
                if job_dir.exists():
                    for file in job_dir.iterdir():
                        file.unlink()
                    job_dir.rmdir()
                
                session.delete(job)
                deleted_count += 1
                logger.info("cleanup_failed_job_deleted", job_id=job.id)
            except Exception as e:
                logger.error("cleanup_failed_job_error", job_id=job.id, error=str(e))
        
        session.commit()
        logger.info("cleanup_failed_completed", deleted=deleted_count, total=len(failed_jobs))
