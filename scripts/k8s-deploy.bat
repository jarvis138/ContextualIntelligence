@echo off
REM Kubernetes deployment script for Windows

setlocal enabledelayedexpansion

REM Default values
set ENVIRONMENT=dev
set NAMESPACE=contextual-intelligence
set IMAGE_TAG=latest
set DOCKER_REGISTRY=ghcr.io/contextualintelligence

REM Parse command line arguments
:parse_args
if "%~1"=="" goto :done_parsing
if "%~1"=="-e" (
    set ENVIRONMENT=%~2
    shift
    shift
    goto :parse_args
)
if "%~1"=="--environment" (
    set ENVIRONMENT=%~2
    shift
    shift
    goto :parse_args
)
if "%~1"=="-n" (
    set NAMESPACE=%~2
    shift
    shift
    goto :parse_args
)
if "%~1"=="--namespace" (
    set NAMESPACE=%~2
    shift
    shift
    goto :parse_args
)
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
echo Unknown option: %~1
exit /b 1

:done_parsing
echo Deploying to %ENVIRONMENT% environment in namespace %NAMESPACE%
echo Using image: %DOCKER_REGISTRY%/contextual-intelligence:%IMAGE_TAG%

REM Ensure we're in the kubernetes directory
cd /d "%~dp0\..\kubernetes"

REM Apply environment-specific configurations
if exist "overlays\%ENVIRONMENT%" (
    echo Using environment-specific overlay: %ENVIRONMENT%
    
    REM Update the image tag in the kustomization file
    powershell -Command "(Get-Content 'overlays\%ENVIRONMENT%\kustomization.yaml') -replace 'newTag:.*', 'newTag: %IMAGE_TAG%' | Set-Content 'overlays\%ENVIRONMENT%\kustomization.yaml'"
    powershell -Command "(Get-Content 'overlays\%ENVIRONMENT%\kustomization.yaml') -replace 'newName:.*', 'newName: %DOCKER_REGISTRY%/contextual-intelligence' | Set-Content 'overlays\%ENVIRONMENT%\kustomization.yaml'"
    
    REM Apply the configuration
    kubectl apply -k "overlays\%ENVIRONMENT%"
) else (
    echo No environment-specific overlay found, using base configuration
    
    REM Update the image tag in the kustomization file
    powershell -Command "(Get-Content 'kustomization.yaml') -replace 'newTag:.*', 'newTag: %IMAGE_TAG%' | Set-Content 'kustomization.yaml'"
    powershell -Command "(Get-Content 'kustomization.yaml') -replace 'newName:.*', 'newName: %DOCKER_REGISTRY%/contextual-intelligence' | Set-Content 'kustomization.yaml'"
    
    REM Apply the configuration
    kubectl apply -k .
)

REM Wait for the deployment to complete
echo Waiting for deployment to complete...
kubectl rollout status deployment/contextual-intelligence-app -n %NAMESPACE%

echo Deployment completed successfully!