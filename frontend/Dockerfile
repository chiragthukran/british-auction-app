FROM node:alpine AS base

WORKDIR /app

COPY . .

RUN npm install
RUN npm run build
WORKDIR /app/dist/



CMD ["npm", "run", "dev"]