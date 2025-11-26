# Simple Dockerfile to run backend
FROM node:18-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm install --production
COPY backend .
ENV PORT=5000
EXPOSE 5000
CMD ["node","server.js"]