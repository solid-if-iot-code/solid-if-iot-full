import { EVENTS, Session } from "@inrupt/solid-client-authn-node";
import * as dotenv from "dotenv";
import path from "path";
import * as fs from "fs";
import { fileURLToPath } from 'url';
import { NaiveMqttListener } from "./NaiveMQTTListener.js";
import { PushSpliceMqttListener } from "./PushSpliceMQTTListener.js";

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);
const ENV_PATH = path.join(__dirname, "/.env");

async function ensureEnvPresent(path: string): Promise<boolean | Error> {
    return new Promise((resolve, reject) => {
        fs.access(path, fs.constants.F_OK, (err: any) => {
            if (err) {
                reject(err);
            }
            resolve(true);
        })
    })
}

console.log(process.argv);
let myMqttObj: any;
if (Number.parseInt(process.argv[4]) > 0) {
    myMqttObj = new PushSpliceMqttListener(process.argv[2], Number.parseInt(process.argv[3]));
} else {
    myMqttObj = new NaiveMqttListener(process.argv[2], Number.parseInt(process.argv[3]));
}


setTimeout(async () =>{
    await myMqttObj.saveOnceMore();
    await myMqttObj.destroy();
    process.exit(0);
}, 300000);
await myMqttObj.setup();
myMqttObj.initMqttClientCache();
myMqttObj.startSavingCycle();
await myMqttObj.initSensorContactsSocket();
await myMqttObj.initSensorContainerSocket();
await myMqttObj.initSubscribedTopicsSocket();





