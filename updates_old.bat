@echo off
title Install Windows Updates Including Optional Drivers
setlocal

echo =====================================================
echo Windows Update trigger + optional driver install
echo Running as current user - no admin elevation requested
echo =====================================================
echo.

set "PS1=%TEMP%\Install-WU-Optional-Drivers.ps1"

> "%PS1%" echo $ErrorActionPreference = 'Continue'
>> "%PS1%" echo $LogDir = Join-Path $env:USERPROFILE 'WindowsUpdate-Logs'
>> "%PS1%" echo New-Item -ItemType Directory -Path $LogDir -Force ^| Out-Null
>> "%PS1%" echo $LogFile = Join-Path $LogDir ('WU-Install-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.log')
>> "%PS1%" echo Start-Transcript -Path $LogFile -Force
>> "%PS1%" echo.
>> "%PS1%" echo Write-Host 'Starting Windows Update scan/download/install commands...'
>> "%PS1%" echo try { Start-Process -FilePath "$env:windir\System32\UsoClient.exe" -ArgumentList 'StartScan' -WindowStyle Hidden } catch {}
>> "%PS1%" echo Start-Sleep -Seconds 8
>> "%PS1%" echo try { Start-Process -FilePath "$env:windir\System32\UsoClient.exe" -ArgumentList 'StartDownload' -WindowStyle Hidden } catch {}
>> "%PS1%" echo Start-Sleep -Seconds 8
>> "%PS1%" echo try { Start-Process -FilePath "$env:windir\System32\UsoClient.exe" -ArgumentList 'StartInstall' -WindowStyle Hidden } catch {}
>> "%PS1%" echo Start-Sleep -Seconds 5
>> "%PS1%" echo.
>> "%PS1%" echo $NeedReboot = $false
>> "%PS1%" echo.
>> "%PS1%" echo function Install-UpdatesByCriteria {
>> "%PS1%" echo     param(
>> "%PS1%" echo         [string]$Criteria,
>> "%PS1%" echo         [string]$Label
>> "%PS1%" echo     )
>> "%PS1%" echo.
>> "%PS1%" echo     Write-Host ''
>> "%PS1%" echo     Write-Host '====================================================='
>> "%PS1%" echo     Write-Host $Label
>> "%PS1%" echo     Write-Host "Search criteria: $Criteria"
>> "%PS1%" echo     Write-Host '====================================================='
>> "%PS1%" echo.
>> "%PS1%" echo     try {
>> "%PS1%" echo         $Session = New-Object -ComObject Microsoft.Update.Session
>> "%PS1%" echo         $Session.ClientApplicationID = 'User Triggered Windows Update Install'
>> "%PS1%" echo         $Searcher = $Session.CreateUpdateSearcher()
>> "%PS1%" echo         $Searcher.Online = $true
>> "%PS1%" echo         $SearchResult = $Searcher.Search($Criteria)
>> "%PS1%" echo     } catch {
>> "%PS1%" echo         Write-Host 'Search failed:' $_.Exception.Message
>> "%PS1%" echo         return
>> "%PS1%" echo     }
>> "%PS1%" echo.
>> "%PS1%" echo     if ($SearchResult.Updates.Count -eq 0) {
>> "%PS1%" echo         Write-Host 'No matching updates found.'
>> "%PS1%" echo         return
>> "%PS1%" echo     }
>> "%PS1%" echo.
>> "%PS1%" echo     $ToDownload = New-Object -ComObject Microsoft.Update.UpdateColl
>> "%PS1%" echo.
>> "%PS1%" echo     for ($i = 0; $i -lt $SearchResult.Updates.Count; $i++) {
>> "%PS1%" echo         $Update = $SearchResult.Updates.Item($i)
>> "%PS1%" echo         Write-Host ('Found: ' + $Update.Title)
>> "%PS1%" echo.
>> "%PS1%" echo         if (-not $Update.EulaAccepted) {
>> "%PS1%" echo             try { $Update.AcceptEula() } catch { Write-Host 'Could not accept EULA:' $_.Exception.Message }
>> "%PS1%" echo         }
>> "%PS1%" echo.
>> "%PS1%" echo         try { $null = $ToDownload.Add($Update) } catch {}
>> "%PS1%" echo     }
>> "%PS1%" echo.
>> "%PS1%" echo     if ($ToDownload.Count -eq 0) {
>> "%PS1%" echo         Write-Host 'No updates added to download queue.'
>> "%PS1%" echo         return
>> "%PS1%" echo     }
>> "%PS1%" echo.
>> "%PS1%" echo     try {
>> "%PS1%" echo         Write-Host 'Downloading...'
>> "%PS1%" echo         $Downloader = $Session.CreateUpdateDownloader()
>> "%PS1%" echo         $Downloader.Updates = $ToDownload
>> "%PS1%" echo         $DownloadResult = $Downloader.Download()
>> "%PS1%" echo         Write-Host ('Download result code: ' + $DownloadResult.ResultCode)
>> "%PS1%" echo     } catch {
>> "%PS1%" echo         Write-Host 'Download failed:' $_.Exception.Message
>> "%PS1%" echo         return
>> "%PS1%" echo     }
>> "%PS1%" echo.
>> "%PS1%" echo     $ToInstall = New-Object -ComObject Microsoft.Update.UpdateColl
>> "%PS1%" echo.
>> "%PS1%" echo     for ($i = 0; $i -lt $ToDownload.Count; $i++) {
>> "%PS1%" echo         $Update = $ToDownload.Item($i)
>> "%PS1%" echo         if ($Update.IsDownloaded) {
>> "%PS1%" echo             Write-Host ('Ready to install: ' + $Update.Title)
>> "%PS1%" echo             try { $null = $ToInstall.Add($Update) } catch {}
>> "%PS1%" echo         } else {
>> "%PS1%" echo             Write-Host ('Not downloaded, skipped: ' + $Update.Title)
>> "%PS1%" echo         }
>> "%PS1%" echo     }
>> "%PS1%" echo.
>> "%PS1%" echo     if ($ToInstall.Count -eq 0) {
>> "%PS1%" echo         Write-Host 'Nothing ready to install.'
>> "%PS1%" echo         return
>> "%PS1%" echo     }
>> "%PS1%" echo.
>> "%PS1%" echo     try {
>> "%PS1%" echo         Write-Host 'Installing...'
>> "%PS1%" echo         $Installer = $Session.CreateUpdateInstaller()
>> "%PS1%" echo         $Installer.Updates = $ToInstall
>> "%PS1%" echo         $InstallResult = $Installer.Install()
>> "%PS1%" echo         Write-Host ('Install result code: ' + $InstallResult.ResultCode)
>> "%PS1%" echo.
>> "%PS1%" echo         for ($i = 0; $i -lt $ToInstall.Count; $i++) {
>> "%PS1%" echo             $Result = $InstallResult.GetUpdateResult($i)
>> "%PS1%" echo             Write-Host ('Update result: ' + $ToInstall.Item($i).Title + ' = ' + $Result.ResultCode)
>> "%PS1%" echo         }
>> "%PS1%" echo.
>> "%PS1%" echo         if ($InstallResult.RebootRequired) {
>> "%PS1%" echo             $script:NeedReboot = $true
>> "%PS1%" echo         }
>> "%PS1%" echo     } catch {
>> "%PS1%" echo         Write-Host 'Install failed:' $_.Exception.Message
>> "%PS1%" echo     }
>> "%PS1%" echo }
>> "%PS1%" echo.
>> "%PS1%" echo Install-UpdatesByCriteria "IsInstalled=0 and IsHidden=0 and Type='Software' and BrowseOnly=0" 'Required Windows/software updates'
>> "%PS1%" echo Install-UpdatesByCriteria "IsInstalled=0 and IsHidden=0 and Type='Software' and BrowseOnly=1" 'Optional Windows/software updates'
>> "%PS1%" echo Install-UpdatesByCriteria "IsInstalled=0 and IsHidden=0 and Type='Driver' and BrowseOnly=0" 'Required driver updates'
>> "%PS1%" echo Install-UpdatesByCriteria "IsInstalled=0 and IsHidden=0 and Type='Driver' and BrowseOnly=1" 'Optional driver updates'
>> "%PS1%" echo.
>> "%PS1%" echo Write-Host ''
>> "%PS1%" echo Write-Host 'Running final install trigger...'
>> "%PS1%" echo try { Start-Process -FilePath "$env:windir\System32\UsoClient.exe" -ArgumentList 'StartInstall' -WindowStyle Hidden } catch {}
>> "%PS1%" echo.
>> "%PS1%" echo Write-Host ''
>> "%PS1%" echo Write-Host 'Done.'
>> "%PS1%" echo Write-Host "Log saved to: $LogFile"
>> "%PS1%" echo.
>> "%PS1%" echo if ($NeedReboot) {
>> "%PS1%" echo     Write-Host 'A restart is required.'
>> "%PS1%" echo } else {
>> "%PS1%" echo     Write-Host 'No restart was directly requested, but restart is recommended after driver updates.'
>> "%PS1%" echo }
>> "%PS1%" echo.
>> "%PS1%" echo Stop-Transcript

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS1%"

echo.
echo Opening Windows Update page...
start ms-settings:windowsupdate

echo.
echo Opening Optional Updates page...
start ms-settings:windowsupdate-optionalupdates

echo.
echo Finished.
echo Log saved under: %USERPROFILE%\WindowsUpdate-Logs
echo.
pause