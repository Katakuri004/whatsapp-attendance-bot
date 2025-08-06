#!/bin/bash

# WhatsApp Attendance Bot - Start Script
echo "🚀 Starting WhatsApp Attendance Bot..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v14 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 14 ]; then
    echo "❌ Node.js version must be 14 or higher. Current version: $(node -v)"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm."
    exit 1
fi

# Check if MongoDB is running (for local development)
if [ "$NODE_ENV" != "production" ]; then
    echo "🔍 Checking MongoDB connection..."
    if ! command -v mongosh &> /dev/null && ! command -v mongo &> /dev/null; then
        echo "⚠️  MongoDB CLI not found. Make sure MongoDB is installed and running."
        echo "   Or set MONGODB_URI to use a remote MongoDB instance."
    fi
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p whatsapp-session
mkdir -p logs

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ .env file created. Please edit it with your configuration."
    else
        echo "❌ .env.example not found. Please create .env file manually."
    fi
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies."
        exit 1
    fi
fi

# Start the bot
echo "🤖 Starting the bot..."
echo "📱 Make sure your phone is ready to scan the QR code!"
echo "🔍 Bot logs will appear below..."
echo "-------------------------------------------"

# Use different start commands based on environment
if [ "$NODE_ENV" = "development" ]; then
    npm run dev
else
    npm start
fi