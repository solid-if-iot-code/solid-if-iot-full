<h1>Folder structure</h1>

<h2>Tree navigation</h2>
<ul>
    <li>processng - contains dataframes and scripts in js/python to parse</li>
    <li>css_files - contains files compatible with community solid server v6</li>
    <li>inrupt_files - contains files compatible with inrupt enterprise solid server v2</li>
</ul>

<h2>Script navigation</h2>

<ul>
    <li>naive.ps1 - script to run the corresponding naive data stream and start broker and/or emitter</li>
    <li>push_splice.ps1 - powershell script to run the corresponding push splice data stream and start broker and/or emitter</li>
</ul>

<h2>Subtree navigation</h2>
<ul>
<li>mqtt-broker - simulates an mqtt broker using aedes in nodejs</li>
<li>mqtt-emitter - simulates mqtt publishers using mqtt package in nodejs</li>
<li>solid-if-iot-client - client application for creating inbox and viewing shared sensor resources</li>
<li>solid-if-iot-steward - manager application for sharing owned sensors to clients</li>
<li>solid-if-iot-bot-ts - aec code to attach websocket listeners to necessary topic resources and begin streaming data to cmd line specified resource</li>
</ul>