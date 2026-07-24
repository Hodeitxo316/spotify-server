#!/bin/bash
# Setup script for Oracle Cloud Free Tier
# Run this on your Ubuntu VM after SSH-ing in

echo "=== Installing Node.js ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "=== Installing yt-dlp ==="
sudo apt-get install -y python3-pip
sudo pip3 install yt-dlp

echo "=== Installing ffmpeg ==="
sudo apt-get install -y ffmpeg

echo "=== Creating app directory ==="
mkdir -p ~/spotify-server
cd ~/spotify-server

echo "=== Copy server files ==="
# You will copy the server files here manually or via SCP

echo "=== Installing dependencies ==="
npm install

echo "=== Opening firewall port 3000 ==="
sudo ufw allow 3000

echo "=== Starting server ==="
node index.js
