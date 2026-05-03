FROM node:20-alpine

WORKDIR /app

# Install dependencies first (layer caching)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source
COPY . .

# Remove dev files that shouldn't be in production
RUN rm -rf .git tests *.test.js .env.example

EXPOSE 8080

# Use the Node server — this is what actually runs server.js and the Gemini proxy
# (The old Dockerfile used nginx-only which killed the /api/gemini backend!)
CMD ["node", "server.js"]
