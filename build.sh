#!/bin/bash
# Build script for Render

# 1. Install Python dependencies
pip install -r requirements.txt

# 2. Build the React frontend
cd frontend
npm install
npm run build
cd ..
