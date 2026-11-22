@echo off
title Windows Update Search & Download (Non-Admin)
setlocal

echo =====================================================
echo Windows Update search + optional driver download
echo Running as current user - no admin elevation requested
echo =====================================================
echo.

:: PowerShell script path
set "PS1=%TEMP%\WU-DownloadOnly.ps1"

:: Create PowerShell script
> "%PS1%" echo $ErrorActionPreference = 'Continue'
>> "%PS1%" echo $LogDir = Join-Path $env:USERPROFILE 'WindowsUpdate-Logs'
>> "%PS1%" echo New-Item -ItemType Directory -Path $LogDir -Force ^| Out-Null
>> "%PS1%" echo $LogFile = Join-Path $LogDir ('WU-DownloadOnly-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.log')
>> "%PS1%" echo Start-Transcript -Path $LogFile -Force
>> "%PS1%" echo
>> "%PS1%" echo Write-Host 'Searching for updates...'
>> "%PS1%" echo try {
>> "%PS1%" echo     $Session = New-Object -ComObject Microsoft.Update.Session
>> "%PS1%" echo     $Searcher = $Session.CreateUpdateSearcher()
>> "%PS1%" echo     $Searcher.Online = $true
>> "%PS1%" echo } catch {
>> "%PS1%" echo     Write-Host 'Failed to create update session:' $_.Exception.Message
>> "%PS1%" echo     exit
>> "%PS1%" echo }
>> "%PS1%" echo
>> "%PS1%" echo function Download-UpdatesByCriteria {
>> "%PS1%" echo     param([string]$Criteria, [string]$Label)
>> "%PS1%" echo
>> "%PS1%" echo     Write-Host ''
>> "%PS1%" echo     Write-Host '====================================================='
>> "%PS1%" echo     Write-Host $Label
>> "%PS1%" echo     Write-Host "Search criteria: $Criteria"
>> "%PS1%" echo     Write-Host '====================================================='
>> "%PS1%" echo
>> "%PS1%" echo     try {
>> "%PS1%" echo         $SearchResult = $Searcher.Search($Criteria)
>> "%PS1%" echo     } catch {
>> "%PS1%" echo         Write-Host 'Search failed:' $_.Exception.Message
>> "%PS1%" echo         return
>> "%PS1%" echo     }
>> "%PS1%" echo
>> "%PS1%" echo     if ($SearchResult.Updates.Count -eq 0) {
>> "%PS1%" echo         Write-Host 'No matching updates found.'
>> "%PS1%" echo         return
>> "%PS1%" echo     }
>> "%PS1%" echo
>> "%PS1%" echo     $ToDownload = New-Object -ComObject Microsoft.Update.UpdateColl
>> "%PS1%" echo
>> "%PS1%" echo     for ($i = 0; $i -lt $SearchResult.Updates.Count; $i++) {
>> "%PS1%" echo         $Update = $SearchResult.Updates.Item($i)
>> "%PS1%" echo         Write-Host ('Found: ' + $Update.Title)
>> "%PS1%" echo         try { $Update.AcceptEula() } catch {}
>> "%PS1%" echo         try { $null = $ToDownload.Add($Update) } catch {}
>> "%PS1%" echo     }
>> "%PS1%" echo
>> "%PS1%" echo     if ($ToDownload.Count -eq 0) {
>> "%PS1%" echo         Write-Host 'No updates added to download queue.'
>> "%PS1%" echo         return
>> "%PS1%" echo     }
>> "%PS1%" echo
>> "%PS1%" echo     try {
>> "%PS1%" echo         Write-Host 'Downloading updates (if allowed for non-admin)...'
>> "%PS1%" echo         $Downloader = $Session.CreateUpdateDownloader()
>> "%PS1%" echo         $Downloader.Updates = $ToDownload
>> "%PS1%" echo         $DownloadResult = $Downloader.Download()
>> "%PS1%" echo         Write-Host ('Download result code: ' + $DownloadResult.ResultCode)
>> "%PS1%" echo     } catch {
>> "%PS1%" echo         Write-Host 'Download failed:' $_.Exception.Message
>> "%PS1%" echo     }
>> "%PS1%" echo
>> "%PS1%" echo     Write-Host "Updates queued for manual install. Open Settings → Windows Update to install."
>> "%PS1%" echo }

>> "%PS1%" echo
>> "%PS1%" echo Download-UpdatesByCriteria "IsInstalled=0 and IsHidden=0 and Type='Software'" "Windows/software updates"
>> "%PS1%" echo Download-UpdatesByCriteria "IsInstalled=0 and IsHidden=0 and Type='Driver'" "Driver updates"
>> "%PS1%" echo
>> "%PS1%" echo Stop-Transcript
>> "%PS1%" echo Write-Host "Log saved to: $LogFile"

:: Run PowerShell script
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS1%"

:: Open Windows Update pages for user to install
echo.
echo Opening Windows Update page...
start ms-settings:windowsupdate

echo.
echo Opening Optional Updates page...
start ms-settings:windowsupdate-optionalupdates

echo.
echo Finished. Log saved under: %USERPROFILE%\WindowsUpdate-Logs
echo.
pause
