# Build stage
FROM node:slim AS build

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies)
RUN npm ci

# Copy source code
COPY . .

# Run your build-server script
RUN npm run build-server

# Production stage
FROM node:slim
ENV CONTRIB_DB_PATH=/etc/data/contrib.db
ENV MEDIA_UPLOAD_FOLDER=/etc/data/uploads
ENV NODE_ENV=production
ENV PORT=3000

# Refuse to serve a schema that is behind the code. Run the same image with
# MIGRATION_MODE=job to apply migrations and exit.
ENV MIGRATION_MODE=none

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy build artifacts from the build stage
# Update this path to match your build output location
COPY --from=build /usr/src/app/output/server ./

# Expose the port your app runs on
EXPOSE 3000

# Use non-root user for better security
USER node

# Volume for SQLite database persistence
VOLUME /etc/data

# Set the command to run your application
CMD ["node", "server.js"]