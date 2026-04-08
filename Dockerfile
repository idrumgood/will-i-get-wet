FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Build the Vite frontend (outputs to /app/dist)
RUN yarn build

# Cloud Run sets the PORT environment variable automatically
ENV PORT 8080
EXPOSE 8080

# Start the Express server
CMD ["yarn", "server"]
