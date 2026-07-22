FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY src ./src
COPY .env.example ./

CMD ["npm", "start"]
