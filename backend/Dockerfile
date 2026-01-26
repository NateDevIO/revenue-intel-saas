# Use Python 3.11 slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY backend/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code from backend directory
COPY backend/ .

# Generate synthetic data (only if database doesn't exist)
RUN python -m data.generator || true

# Expose port (Railway will use $PORT environment variable)
EXPOSE 8000

# Start the application using shell to allow $PORT variable substitution
# Railway sets PORT dynamically, default to 8000 for local development
CMD ["/bin/sh", "-c", "uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
