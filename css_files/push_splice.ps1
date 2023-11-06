# had to change the folders because of tsc
$myIntervals = "16", "32", "64", "128", "192", "256"
foreach ($interval in $myIntervals) {
    for ($i = 20; $i -gt 0; $i--) {
        $iterStr = "pushSplice_$($interval)_$([string]$i)_110423"
        echo $iterStr
        $solidUri = "pushsplice_mqttdata_110423/$($iterStr)"
        echo $solidUri
        $logUri = "$($iterStr)"
        $emitterUri = "emitter_$($logUri).csv"
        $serverUri = "server_$($logUri).csv"
        echo $logUri
        Set-Location -Path C:\Users\zg009\rdfs\presentable\css_files
        cd *emitter
        npx tsc
        cd ../*broker
        npx tsc
        cd ../*bot-ts
        npx tsc
        cd ..
        $v = Start-Process node -Wait:$False -ArgumentList @("mqtt-emitter/dist/client.js", $emitterUri)  -PassThru
        $w = Start-Process node -Wait:$False -ArgumentList @("mqtt-broker/dist/broker.js", $serverUri) -PassThru
        $x = Start-Process node -Wait -ArgumentList @("solid-if-iot-bot-ts/dist/server.js", $solidUri, $interval, 1) -PassThru
        $timeouted = $null
        $x | Wait-Process -Timeout 315 -ErrorAction SilentlyContinue -ErrorVariable timeouted
        if ($timeouted) {
            # echo $timeouted
            Stop-Process -Id $x.Id
            Stop-Process -Id $v.Id
            Stop-Process -Id $w.Id
        }
    }
}


