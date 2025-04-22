@echo off
REM Multi-region deployment script for Windows

setlocal enabledelayedexpansion

REM Default values
set IMAGE_TAG=latest
set DOCKER_REGISTRY=ghcr.io/contextualintelligence
set REGIONS=us-east eu-west
set DEPLOY_ALL=true
set PARALLEL=false

REM Parse command line arguments
:parse_args
if "%~1"=="" goto :done_parsing
if "%~1"=="-t" (
    set IMAGE_TAG=%~2
    shift
    shift
    goto :parse_args
)
if "%~1"=="--tag" (
    set IMAGE_TAG=%~2
    shift
    shift
    goto :parse_args
)
if "%~1"=="-r" (
    set DOCKER_REGISTRY=%~2
    shift
    shift
    goto :parse_args
)
if "%~1"=="--registry" (
    set DOCKER_REGISTRY=%~2
    shift
    shift
    goto :parse_args
)
if "%~1"=="-p" (
    set PARALLEL=true
    shift
    goto :parse_args
)
if "%~1"=="--parallel" (
    set PARALLEL=true
    shift
    goto :parse_args
)
if "%~1"=="--region" (
    set DEPLOY_ALL=false
    set REGIONS=%~2
    shift
    shift
    goto :parse_args
)
if "%~1"=="--regions" (
    set DEPLOY_ALL=false
    set REGIONS=%~2
    set REGIONS=!REGIONS:,= !
    shift
    shift
    goto :parse_args
)
echo Unknown option: %~1
exit /b 1

:done_parsing

REM Function to deploy to a region
:deploy_region
set region=%~1
echo Deploying to region: %region%

REM Ensure we're in the kubernetes directory
cd /d "%~dp0\..\kubernetes"

REM Set environment variables for kustomize
set IMAGE_TAG=%IMAGE_TAG%
set DOCKER_REGISTRY=%DOCKER_REGISTRY%

REM Apply the configuration
kubectl apply -k "overlays/regions/%region%"

REM Wait for the deployment to complete
echo Waiting for deployment to complete in %region%...
kubectl rollout status deployment/auth-service -n contextual-intelligence
kubectl rollout status deployment/document-service -n contextual-intelligence
kubectl rollout status deployment/ai-service -n contextual-intelligence

echo Deployment to %region% completed successfully!
exit /b 0

REM Deploy to all specified regions
if "%PARALLEL%"=="true" (
    REM Deploy to all regions in parallel (using start for Windows)
    for %%r in (%REGIONS%) do (
        start /b cmd /c call "%~f0" --region %%r
    )
) else (
    REM Deploy to regions sequentially
    for %%r in (%REGIONS%) do (
        call :deploy_region %%r
    )
)

echo Multi-region deployment completed successfully!
exit /b 0