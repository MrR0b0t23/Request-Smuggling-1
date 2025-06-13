FROM node:18-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Create public directory and copy static files
RUN mkdir -p public
COPY index.html public/
COPY server.js .

EXPOSE 80

CMD ["node", "server.js"] 