#!/bin/bash

# Colors for better output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting installation of all project dependencies...${NC}"

# Backend
if [ -d "backend" ]; then
    echo -e "${GREEN}Installing backend dependencies...${NC}"
    npm install --prefix backend
else
    echo "Backend directory not found."
fi

# Frontend
if [ -d "frontend" ]; then
    echo -e "${GREEN}Installing frontend dependencies...${NC}"
    npm install --prefix frontend
else
    echo "Frontend directory not found."
fi

echo -e "${BLUE}All installations completed successfully!${NC}"
