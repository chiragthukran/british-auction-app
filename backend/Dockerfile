FROM node:alpine AS base

WORKDIR /app

COPY . .

RUN npm install
ARG PORT 
ARG MONGO_URI
ENV PORT=$PORT
ENV MONGO_URI=$MONGO_URI
CMD ["npm", "run", "start"]