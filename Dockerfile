FROM node:22-alpine AS base

WORKDIR /app
COPY package*.json ./
RUN npm install --ignore-engines
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
