# had to change the folders because of tsc
$myIntervals = "15", "10", "5", "3", "2", "1"
foreach ($interval in $myIntervals) {
    for ($i = 20; $i -gt 0; $i--) {
        $time = [string]([int]$interval * 1000)
        $iterStr = "naive_$($interval)_110423_z_$([string]$i)"
        $solidUri = "mqttdata_110423_z/$($iterStr)"
        echo $solidUri
        $logUri = "$($iterStr)"
        echo $logUri
        $emitterUri = "emitter_$($logUri).txt"
        Set-Location -Path C:\Users\zg009\rdfs\presentable\inrupt_files
        cd *emitter
        npx tsc
        cd ../*bot-ts
        npx tsc
        cd ..
        $v = Start-Process node -Wait:$False -ArgumentList @("mqtt-emitter/dist/client.js", $emitterUri)  -PassThru
        $x = Start-Process node -Wait -ArgumentList @("solid-if-iot-bot-ts/dist/server.js", $solidUri, $time, 0) -PassThru
        $timeouted = $null
        $x | Wait-Process -Timeout 315 -ErrorAction SilentlyContinue -ErrorVariable timeouted
        if ($timeouted) {
            # echo $timeouted
            Stop-Process -Id $x.Id
            Stop-Process -Id $v.Id
        }
    }
}


