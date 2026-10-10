# Stage 1: Build the frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Python backend + serve built website
FROM python:3.11-slim
WORKDIR /app

# Install system libraries for Pillow and Tesseract OCR
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY backend/ ./backend/
COPY data/ ./data/
COPY models/ ./models/

# Copy built frontend assets
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

ENV PORT=8000
EXPOSE 8000

# Start server
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
