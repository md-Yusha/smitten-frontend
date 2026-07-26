# Converts JPEG-encoded files disguised as PNGs into real PNG format.
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$filesToConvert = @(
    "d:\Smittenz\assets\images\separation.png",
    "d:\Smittenz\assets\images\ic_launcher_calculator.png",
    "d:\Smittenz\assets\images\ic_launcher_clock.png",
    "d:\Smittenz\android\app\src\main\res\drawable\ic_launcher_calculator.png",
    "d:\Smittenz\android\app\src\main\res\drawable\ic_launcher_clock.png"
)

foreach ($file in $filesToConvert) {
    if (Test-Path $file) {
        Write-Host "Converting $file to true PNG..."
        $tempFile = $file + ".tmp"
        
        $img = [System.Drawing.Image]::FromFile($file)
        $img.Save($tempFile, [System.Drawing.Imaging.ImageFormat]::Png)
        $img.Dispose()
        
        Remove-Item -Path $file -Force
        Move-Item -Path $tempFile -Destination $file -Force
        
        # Verify magic bytes
        $bytes = [IO.File]::ReadAllBytes($file)[0..3]
        Write-Host "Verification bytes: ($($bytes -join ' '))"
    } else {
        Write-Host "File not found (skipping): $file"
    }
}
