FROM node:22-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000
# Aplica as migrations pendentes antes de subir a API
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
