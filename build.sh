#!/bin/bash
# Build script for Render

# 1. Activate Render's Python virtual environment
source /opt/render/project/src/.venv/bin/activate || true

# 2. Install Python dependencies
pip install -r requirements.txt

# 2. Build the React frontend
cd frontend
npm install
npm run build
cd ..
