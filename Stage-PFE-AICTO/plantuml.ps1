param(
    [string]$Input,
    [string]$Output = "",
    [string]$Format = "png"
)
if (-not $Input) {
    Write-Error "Usage: .\plantuml.ps1 -Input diagram.puml [-Output diagram.png] [-Format png|svg|pdf]"
    exit 1
}
$argsList = @("-t$Format", $Input)
if ($Output) { $argsList += "-o"; $argsList += (Split-Path $Output -Parent) }
java -jar "C:\plantuml\plantuml.jar" @argsList
