# HTTP Request Smuggling CTF Lab Part 1 (CL.TE Exploitation)

This is a Capture The Flag (CTF) lab environment focused on HTTP Request Smuggling vulnerabilities. The lab consists of a frontend application and a vulnerable backend service that can be used to practice and learn about HTTP Request Smuggling techniques.

## Project Structure

```
http-smuggling-ctf/
├── frontend/         # Frontend application
├── backend/         # Backend service
└── docker-compose.yml
```

## Prerequisites

- Docker
- Docker Compose

## Getting Started

1. Clone this repository
2. Run the environment:
   ```bash
   docker-compose up --build
   ```
3. Access the frontend at `http://localhost/` or `http://<ip_of_machine>/`

## Security Notice

This lab is designed for educational purposes only. The backend service intentionally contains vulnerabilities related to HTTP Request Smuggling. Do not deploy this in a production environment. 
