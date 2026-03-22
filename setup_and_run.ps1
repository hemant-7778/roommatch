# PowerShell script to setup Maven and run RoomMatch

$mavenVersion = "3.9.6"
$mavenDirName = "apache-maven-$mavenVersion"
$mavenZipName = "maven.zip"
$mavenUrl = "https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/$mavenVersion/apache-maven-$mavenVersion-bin.zip"

# 1. Check if Maven is already present locally
if (-not (Test-Path "$PSScriptRoot\$mavenDirName\bin\mvn.cmd")) {
    Write-Host "Maven not found locally. Downloading Maven $mavenVersion..." -ForegroundColor Cyan
    
    try {
        # Download
        Invoke-WebRequest -Uri $mavenUrl -OutFile "$PSScriptRoot\$mavenZipName"
        
        # Extract
        Write-Host "Extracting Maven..." -ForegroundColor Cyan
        Expand-Archive -Path "$PSScriptRoot\$mavenZipName" -DestinationPath "$PSScriptRoot" -Force
        
        # Cleanup
        Remove-Item "$PSScriptRoot\$mavenZipName"
        Write-Host "Maven installed successfully to $PSScriptRoot\$mavenDirName" -ForegroundColor Green
    } catch {
        Write-Error "Failed to download or install Maven. Please check your internet connection."
        exit 1
    }
} else {
    Write-Host "Using local Maven from $PSScriptRoot\$mavenDirName" -ForegroundColor Green
}

# 2. Add Maven to temporary PATH for this session
$env:Path = "$PSScriptRoot\$mavenDirName\bin;" + $env:Path

# 3. verify Java
if (-not $env:JAVA_HOME) {
    Write-Warning "JAVA_HOME is not set. Maven might fail if it cannot find Java."
    Write-Host "Attempting to run anyway using 'java' from PATH..."
}

# 4. Run the Application
Write-Host "Starting RoomMatch Application..." -ForegroundColor Cyan
Write-Host "The application will be available at http://localhost:8080" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server." -ForegroundColor Yellow

# Ensure we are in the project root (where the script and pom.xml allow)
Set-Location $PSScriptRoot

mvn spring-boot:run | Out-File -FilePath "debug.log" -Encoding UTF8
