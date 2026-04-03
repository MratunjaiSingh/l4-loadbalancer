 # L4 Load Balancer

A high-performance Layer 4 TCP Load Balancer built in C++ with a real-time React dashboard.

## 🔴 Live Demo
>
> Dashboard: https://brilliant-panda-50c961.netlify.app

## ⚡ Features
- TCP connection proxying via Boost.Asio
- Round Robin, Weighted, Least Connections algorithms
- Real-time health checks per backend
- Live WebSocket metrics dashboard
- Graceful shutdown & auto-failover

## 🛠 Tech Stack
- **Backend**: C++23, Boost.Asio, uWebSockets
- **Dashboard**: React 18, Vite, TypeScript, Recharts
- **Deploy**: Docker, Fly.io, GitHub Actions

## 🚀 Run Locally
```bash
cd dashboard
npm install
npm run dev
```
Open http://localhost:5173

## 📊 Architecture
Client → TCP Listener → Load Balancer → Backend Pool