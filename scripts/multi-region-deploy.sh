#!/bin/bash
# Multi-region deployment script

set -e

# Default values
IMAGE_TAG="latest"
DOCKER_REGISTRY="ghcr.io/contextualintelligence"
REGIONS=("us-east" "eu-west")
DEPLOY_ALL=true
PARALLEL=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    -t|--tag)
      IMAGE_TAG="$2"
      shift
      shift
      ;;
    -r|--registry)
      DOCKER_REGISTRY="$2"
      shift
      shift
      ;;
    -p|--parallel)
      PARALLEL=true
      shift
      ;;
    --region)
      DEPLOY_ALL=false
      REGIONS=("$2")
      shift
      shift
      ;;
    --regions)
      DEPLOY_ALL=false
      IFS=',' read -ra REGIONS <<< "$2"
      shift
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Function to deploy to a region
deploy_region() {
  local region=$1
  echo "Deploying to region: $region"
  
  # Ensure we're in the kubernetes directory
  cd "$(dirname "$0")/../kubernetes"
  
  # Set environment variables for kustomize
  export IMAGE_TAG=$IMAGE_TAG
  export DOCKER_REGISTRY=$DOCKER_REGISTRY
  
  # Apply the configuration
  kubectl apply -k "overlays/regions/$region"
  
  # Wait for the deployment to complete
  echo "Waiting for deployment to complete in $region..."
  kubectl rollout status deployment/auth-service -n contextual-intelligence
  kubectl rollout status deployment/document-service -n contextual-intelligence
  kubectl rollout status deployment/ai-service -n contextual-intelligence
  
  echo "Deployment to $region completed successfully!"
}

# Deploy to all specified regions
if [ "$PARALLEL" = true ]; then
  # Deploy to all regions in parallel
  for region in "${REGIONS[@]}"; do
    deploy_region "$region" &
  done
  
  # Wait for all background processes to complete
  wait
else
  # Deploy to regions sequentially
  for region in "${REGIONS[@]}"; do
    deploy_region "$region"
  done
fi

echo "Multi-region deployment completed successfully!"