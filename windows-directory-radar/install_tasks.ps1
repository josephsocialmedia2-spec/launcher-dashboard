$ErrorActionPreference = 'Stop'
$base = Join-Path $env:LOCALAPPDATA 'F1DirectoryRadar'
$py = Join-Path $base '.venv\Scripts\python.exe'
$pyw = Join-Path $base '.venv\Scripts\pythonw.exe'
$script = Join-Path $base 'f1_directory_radar_mobile.py'
$desktop = [Environment]::GetFolderPath('Desktop')
$docs = [Environment]::GetFolderPath('MyDocuments')
$inputDir = Join-Path $docs 'F1_Directory_Radar\IMPORTA_CONTATTI'
New-Item -ItemType Directory -Force -Path $inputDir | Out-Null

function Shortcut($name,$target,$args,$work,$icon) {
  $shell = New-Object -ComObject WScript.Shell
  $lnk = $shell.CreateShortcut((Join-Path $desktop ($name + '.lnk')))
  $lnk.TargetPath = $target
  $lnk.Arguments = $args
  $lnk.WorkingDirectory = $work
  if ($icon) { $lnk.IconLocation = $icon }
  $lnk.Save()
}

Shortcut 'F1 - AGGIORNA NUMERI E ANNUNCI' $py ('"'+$script+'" --manual') $base 'shell32.dll,14'
Shortcut 'F1 - REPORT ACQUISIZIONE' $pyw ('"'+$script+'" --open-report') $base 'shell32.dll,23'
Shortcut 'F1 - IMPORTA ELENCHI' 'explorer.exe' ('"'+$inputDir+'"') $inputDir 'shell32.dll,4'

$user = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited
$settingsNight = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 5)
$settingsReport = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 10)

$actionNight = New-ScheduledTaskAction -Execute $pyw -Argument ('"'+$script+'" --night') -WorkingDirectory $base
$triggerNight = New-ScheduledTaskTrigger -Daily -At '02:30'
Register-ScheduledTask -TaskName 'F1 Directory Radar - Notte' -Action $actionNight -Trigger $triggerNight -Principal $principal -Settings $settingsNight -Description 'Aggiorna annunci, vie e contatti pubblici PagineBianche/PagineGialle, prepara il report e sincronizza F1 OS Mobile Ready.' -Force | Out-Null

$actionReport = New-ScheduledTaskAction -Execute $pyw -Argument ('"'+$script+'" --open-report') -WorkingDirectory $base
$triggerReport = New-ScheduledTaskTrigger -Daily -At '08:00'
Register-ScheduledTask -TaskName 'F1 Directory Radar - Report Mattino' -Action $actionReport -Trigger $triggerReport -Principal $principal -Settings $settingsReport -Description 'Apre il report F1 pronto per il lavoro dalla scrivania.' -Force | Out-Null

Write-Host 'Task installati:' -ForegroundColor Green
Write-Host '  02:30  F1 Directory Radar - Notte + sync F1 OS Mobile Ready'
Write-Host '  08:00  F1 Directory Radar - Report Mattino'
Write-Host 'Collegamenti creati sul Desktop.'
