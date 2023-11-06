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

const session = new Session();

let myMqttObj: any;
if (Number.parseInt(process.argv[4]) > 0) {
    myMqttObj = new PushSpliceMqttListener(session, process.argv[2], Number.parseInt(process.argv[3]));
} else {
    myMqttObj = new NaiveMqttListener(session, process.argv[2], Number.parseInt(process.argv[3]));
}

session.events.on(EVENTS.SESSION_EXPIRED, async () => {
    console.log(`session refreshing`);
    
    session.login({
        clientId: process.env.clientId,
        clientSecret: process.env.clientSecret,
        oidcIssuer: process.env.oidcIssuer,
    }).then(async () => {
        myMqttObj.setSession(session);
        await myMqttObj.saveOnceMore();
        await myMqttObj.destroy();
        process.exit(0);
    })
});

const envPresent = await ensureEnvPresent(ENV_PATH);
if (envPresent) {
    dotenv.config({ path: ENV_PATH });
} else {
    throw new Error("no environment variables!");
}

await session.login({
    clientId: process.env.clientId,
    clientSecret: process.env.clientSecret,
    oidcIssuer: process.env.oidcIssuer,
});
console.log(session.info.webId);
await myMqttObj.setup();
myMqttObj.initMqttClientCache();
myMqttObj.startSavingCycle();
myMqttObj.initSensorContactsSocket();
myMqttObj.initSensorContainerSocket();
myMqttObj.initSubscribedTopicsSocket();

setTimeout(async () => {
    await myMqttObj.saveOnceMore();
    await myMqttObj.destroy();
    process.exit(0);
}, 300000);





