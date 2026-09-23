# Create ICO from PNG using PNG-in-ICO (Vista+ format — supported by NSIS and Windows)
param(
    [string]$PngPath = "assets\icons\icon.png",
    [string]$IcoPath = "assets\icons\icon.ico"
)

$pngData = [System.IO.File]::ReadAllBytes($PngPath)
$stream  = New-Object System.IO.MemoryStream
$writer  = New-Object System.IO.BinaryWriter($stream)

# ICONDIR header (6 bytes)
$writer.Write([uint16]0)   # reserved
$writer.Write([uint16]1)   # type = ICO
$writer.Write([uint16]1)   # image count = 1

# ICONDIRENTRY (16 bytes)
$writer.Write([byte]0)     # width  (0 = 256px)
$writer.Write([byte]0)     # height (0 = 256px)
$writer.Write([byte]0)     # color count (0 = no palette)
$writer.Write([byte]0)     # reserved
$writer.Write([uint16]1)   # planes
$writer.Write([uint16]32)  # bit depth
$writer.Write([uint32]$pngData.Length)  # image data size
$writer.Write([uint32]22)  # image data offset (6 header + 16 dir entry = 22)

# PNG image data
$writer.Write($pngData)
$writer.Close()

[System.IO.File]::WriteAllBytes($IcoPath, $stream.ToArray())
$size = (Get-Item $IcoPath).Length
Write-Host "ICO created successfully: $IcoPath ($size bytes)"
