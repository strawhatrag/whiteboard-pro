# 🎨 Distributed Whiteboard System

This repository contains the source code and configuration files for a scalable, real-time distributed whiteboard application, built as a Private Cloud Infrastructure project.

The system is designed to allow multiple users to draw simultaneously on a shared canvas while guaranteeing **data consistency** across three separate application servers.

## 🚀 System Architecture Overview (Task 1)

Our architecture uses **Docker containers** to provide horizontal scalability and uses **Redis** as a centralized synchronization tool.

| Component | Role in the System | Key Feature |
| :--- | :--- | :--- |
| **3 x Node.js Apps** | The autonomous agents running the whiteboard logic. | **Scalable Compute**. |
| **NGINX** | The public entrance and **Load Balancer** (Port 80). | Enforces **Sticky Sessions (`ip_hash`)** for stable, low-latency WebSocket connections. |
| **Redis** | The central messaging and storage tool. | Provides **Data Persistence** (saves all drawing strokes) and **Synchronization (Pub/Sub)**. |
| **cAdvisor** | The monitoring tool (Port 8080). | Scrapes CPU/RAM metrics to show **resource management**. |

## ⚙️ How to Deploy the System

This project is designed to be deployed on an AWS EC2 instance (or any host with Docker installed) using Docker Compose.

### Prerequisites

* Docker and Docker Compose (v2 syntax) installed.
* The necessary firewall ports (Security Group) opened on your host: **80** (NGINX) and **8080** (cAdvisor).

### Steps

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/strawhatrag/whiteboard-pro.git
    cd whiteboard-pro
    ```

2.  **Start the Full Stack**
    The command below builds the Node.js application image, and then starts all six services (3 App Nodes, Redis, NGINX, cAdvisor) in the background (`-d`).
    ```bash
    docker-compose up --build -d
    ```

3.  **Verify Services**
    Check that all six containers are running correctly:
    ```bash
    docker-compose ps
    ```

## 🌐 Accessing the Application and Monitoring

Once deployed, you can access the system via your host's public IP address.

| Access Point | URL/Port | Purpose |
| :--- | :--- | :--- |
| **Whiteboard Application** | `http://[YOUR_HOST_IP]/` | Connects via NGINX (Port 80) to the distributed App cluster. |
| **System Monitoring** | `http://[YOUR_HOST_IP]:8080/` | Shows the **cAdvisor Dashboard** for live CPU/RAM usage of all containers. |

## ✨ Key Technical Achievements

The system successfully solves the three biggest challenges of distributed real-time systems:

1.  **Guaranteed Consistency (Task 3):** We use **Redis Pub/Sub** to instantly synchronize drawing events across all three App nodes. This ensures that every user sees the exact same image at the same time, even though they may be connected to different servers.
2.  **State Persistence:** All drawing strokes are saved to a **Redis List**, guaranteeing that the entire board history is loaded for new users and survives server restarts.
3.  **Quality of Service (QoS):** The NGINX load balancer ensures that the complex real-time connection stays stable (sticky sessions), providing a reliable, low-latency user experience.

## 📝 Project Structure

The repository is organized as follows:
