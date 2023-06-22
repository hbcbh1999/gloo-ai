#!bin/bash

# Build the docker image and tag it
docker login -u AWS -p $(aws ecr get-login-password --region us-east-1) 404337120808.dkr.ecr.us-east-1.amazonaws.com && \
docker build -t gloo-service -f apps/backend/Dockerfile . && \
docker tag gloo-service 404337120808.dkr.ecr.us-east-1.amazonaws.com/gloo-service:latest
