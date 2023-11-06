import * as crypto from "crypto";
import * as mqtt from "mqtt";
import fs from "fs/promises";
import {
    saveSolidDatasetAt,
    buildThing,
    getSolidDataset,
    createThing,
    setThing,
    getStringNoLocale,
    getThingAll,
    universalAccess,
    SolidDataset,
    ThingPersisted,
    getThing,
} from "@inrupt/solid-client";
import {
    DEFAULT_PAYLOAD_URI, 
    DEFAULT_SENSOR_CONTACTS_URI_PATH, 
    DEFAULT_SENSOR_CONTAINER_STRING,
    DEFAULT_SUBSCRIBED_TOPICS_URI_PATH, 
    DEFAULT_TOPIC_URI, 
    DEFAULT_WEBID_CONTACT_IRI
} from "./constants.js";
import { 
    extractStringsFromThing, 
    getAllContainedResourcesInDataset, 
    getAllThingsWithIri, 
    getDataOrCreateDataset, 
} from "./utils.js";
import { createDpopHeader, generateDpopKeyPair, buildAuthenticatedFetch } from '@inrupt/solid-client-authn-core';
import fetch from 'node-fetch';
import { WebSocket } from 'ws';

export class NaiveMqttListener {
    // maybe use the store when the streams are getting overwhelming?
    // private auxStore: mqtt.Store;
    private auxStore: string[] = [];
    private counter = 0;
    private id: string;
    private _initTime: number;
    webId!: string;
    private _storageUri!: string;
    private _dataUri!: string;
    mqttData!: SolidDataset;
    private _intervalId!: NodeJS.Timer;
    private _sensorContactsUri!: string;
    sensorContactsCache!: string[];
    private _graph!: ThingPersisted;
    private _profile!: ThingPersisted;
    private _sensorContainerResourceUri!: string;
    private _containedSensorResourceUris!: string[];
    private _subscribedTopicsUri!: string;
    private _saveInterval: number;
    private _dataUriPath: string;
    subscribedTopicsDataset!: SolidDataset;
    subscribedTopicsCache!: Readonly<{ type: "Subject"; url: string; predicates: Readonly<Record<string, Readonly<Partial<{ literals: Readonly<Record<string, readonly string[]>>; langStrings: Readonly<Record<string, readonly string[]>>; namedNodes: readonly string[]; blankNodes: readonly (`_:${string}` | Readonly<Record<string, Readonly<Partial<any>>>>)[]; }>>>>; }>[];
    mqttClientCache: { [key:string]: mqtt.MqttClient } = {};
    sensorContactsSocket!: WebSocket;
    sensorContainerSocket!: WebSocket;
    subscribedTopicsSocket!: WebSocket;
    private _authFetch!: (input: RequestInfo | URL, init?: RequestInit | undefined) => Promise<Response>;

    constructor(dataUriPath: string, saveInterval: number) {
        this._initTime = Date.now();
        this.id = crypto.randomBytes(8).toString('base64url');
        // this._session = session;
        this._saveInterval = saveInterval;
        this._dataUriPath = dataUriPath;
    };

    async setup
        (
        sensorContactsUriPath: string = DEFAULT_SENSOR_CONTACTS_URI_PATH,
        subscribedTopicsUriPath: string = DEFAULT_SUBSCRIBED_TOPICS_URI_PATH,
        ) {    
        const credentialResponse = await fetch('http://localhost:3000/idp/credentials/', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
                // The email/password fields are those of your account.
                // The name field will be used when generating the ID of your token.
                body: JSON.stringify({ email: 'client@iot.org', password: 'client', name: 'my-token' }),
            });

        // These are the identifier and secret of your token.
        // Store the secret somewhere safe as there is no way to request it again from the server!
        // @ts-ignore
        const { id, secret } = await credentialResponse.json();
        const dpopKey = await generateDpopKeyPair();

        // These are the ID and secret generated in the previous step.
        // Both the ID and the secret need to be form-encoded.
        const authString = `${encodeURIComponent(id)}:${encodeURIComponent(secret)}`;
        // This URL can be found by looking at the "token_endpoint" field at
        // http://localhost:3000/.well-known/openid-configuration
        // if your server is hosted at http://localhost:3000/.
        const tokenUrl = 'http://localhost:3000/.oidc/token';
        const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
                // The header needs to be in base64 encoding.
                authorization: `Basic ${Buffer.from(authString).toString('base64')}`,
                'content-type': 'application/x-www-form-urlencoded',
                dpop: await createDpopHeader(tokenUrl, 'POST', dpopKey),
            },
            body: 'grant_type=client_credentials&scope=webid',
        });

        // This is the Access token that will be used to do an authenticated request to the server.
        // The JSON also contains an "expires_in" field in seconds,
        // which you can use to know when you need request a new Access token.
        // @ts-ignore
        const { access_token: accessToken } = await response.json();
        // @ts-ignore
        this._authFetch = await buildAuthenticatedFetch(fetch, accessToken, { dpopKey });

        this.webId = "http://localhost:3000/client/profile/card#me" // this._session.info.webId as string;
        this._storageUri = "http://localhost:3000/client/" // await getStorageUri(this.webId, this._authFetch) as string
        // console.log(this._storageUri);
        this._dataUri = this._storageUri + this._dataUriPath;
        // console.log(this._dataUri)
        this.mqttData = await getDataOrCreateDataset(this._dataUri, this._authFetch);
        this._sensorContactsUri = this._storageUri + sensorContactsUriPath;
        try {
            await getDataOrCreateDataset(this._sensorContactsUri, this._authFetch);
        } catch (error: any) {
            console.log(error);
        }
        
        this.sensorContactsCache = await getAllThingsWithIri(this._sensorContactsUri, DEFAULT_WEBID_CONTACT_IRI, this._authFetch) as string[];
        // this._graph = await getWebIdGraph(this.webId, this._authFetch);
        // this._profile = await getProfile(this.webId, this._graph, this._authFetch) as ThingPersisted;
        const profile = await getSolidDataset(this.webId, { fetch: this._authFetch });
        // console.log(profile);
        // const profileThings = getThingAll(profile);
        // profileThings.forEach((thing) => console.log(thing));
        const profileThing = getThing(profile, this.webId)
        console.log(profileThing)
        // @ts-ignore
        this._sensorContainerResourceUri = getStringNoLocale(profileThing, DEFAULT_SENSOR_CONTAINER_STRING) as string;
        this._containedSensorResourceUris = await getAllContainedResourcesInDataset(this._sensorContainerResourceUri, this._authFetch);
        this._subscribedTopicsUri = this._storageUri + subscribedTopicsUriPath;
        this.subscribedTopicsDataset = await getSolidDataset(this._subscribedTopicsUri, {fetch: this._authFetch});
        this.subscribedTopicsCache = getThingAll(this.subscribedTopicsDataset);
    }

    private buildMqttCache() {
        for (const st of this.subscribedTopicsCache) {
            const { topicName, topicsUri, qos, brokerUri, sensorUri } = extractStringsFromThing(st!);
            let targetMqttClient = mqtt.connect(brokerUri!);
            const iqos = qos ? Number.parseInt(qos!) as mqtt.QoS : 0;
            targetMqttClient.subscribe(topicName!, { qos: iqos }, (err, packet) => {
                if (err) console.log(err);
                console.log(`[targetMqttClient] ${packet}`);
            })
            // timer-based save 
            targetMqttClient.on('message', (topic, payload, packet) => {
                // console.log(`[targetMqttClient] data to save->received ${topic} with data: ${payload.toString()}`)
                // var id = crypto.randomBytes(20).toString('base64url');
                // console.log(`[targetMqttClient] thing with id: ${this.id}_${this.counter}`)
                let newThing = buildThing(createThing({ name: `${this.id}_${this.counter}` }))
                    .addStringNoLocale(DEFAULT_TOPIC_URI, topic)
                    .addStringNoLocale(DEFAULT_PAYLOAD_URI, payload.toString())
                    .addStringNoLocale("https://www.example.org/identifier#time", process.hrtime.bigint().toString())
                    .build()
                this.auxStore.push(payload.toString());
                this.mqttData = setThing(this.mqttData, newThing);
                this.counter++;
                
            });
            const cacheIdentifier = `${topicsUri}+${topicName}`
            this.mqttClientCache[cacheIdentifier] = targetMqttClient;
        }
    }

    initMqttClientCache() {
        if (this.subscribedTopicsCache.length > 0) {
            this.buildMqttCache();
        }
    }

    async saveOnceMore() {
        try {
            await saveSolidDatasetAt(this._dataUri, this.mqttData, { fetch: this._authFetch });
                // console.log(r);    
            } catch (err) {
                console.error(err);
            }
    }

    startSavingCycle() {
        this._intervalId = setInterval(async () => {
            try {
                await saveSolidDatasetAt(this._dataUri, this.mqttData, { fetch: this._authFetch });
                this.mqttData = await getSolidDataset(this._dataUri, {fetch: this._authFetch});
            } catch (err) {
                console.error(err);
            }    
        }, this._saveInterval);
    }

    async initSensorContactsSocket() {
        const response = await this._authFetch('http://localhost:3000/.notifications/WebSocketChannel2023/', {
            method: 'POST',
            headers: {
                'content-type': 'application/ld+json',
                'accept': 'application/ld+json'
            },
            body: JSON.stringify(
                {
                    "@context": ["https://www.w3.org/ns/solid/notification/v1"],
                    "type": "http://www.w3.org/ns/solid/notifications#WebSocketChannel2023",
                    "topic": this._sensorContactsUri
                }
            )
        })
        const data = await response.json();
        console.log(data['receiveFrom']);
        this.sensorContactsSocket = new WebSocket(data['receiveFrom']);
        this.sensorContactsSocket.onmessage = async (notif) => {
            console.log(notif);
            let newSensorContactsCache = await getAllThingsWithIri(this._sensorContactsUri, DEFAULT_WEBID_CONTACT_IRI, this._authFetch) as string[];
            if (newSensorContactsCache.length > 0) {
                let newSensorContactsWebIds = newSensorContactsCache.filter(contact => !this.sensorContactsCache.includes(contact))
                // for each webId that is new, set their agent access to read for each sensor name 
                //    in the sensor container
                for (const iWebId of newSensorContactsWebIds) {
                    for (const resource of this._containedSensorResourceUris) {
                        await universalAccess.setAgentAccess(resource, iWebId!, { read: true, write: false }, { fetch: this._authFetch })
                    }
                }
            }
            this.sensorContactsCache = newSensorContactsCache as string[];
        }
        this.sensorContactsSocket.onopen = () => {
            console.log('sensor contacts socket open!');
        }
    }

    async initSensorContainerSocket() {
        const response = await this._authFetch('http://localhost:3000/.notifications/WebSocketChannel2023/', {
            method: 'POST',
            headers: {
                'content-type': 'application/ld+json',
                'accept': 'application/ld+json'
            },
            body: JSON.stringify(
                {
                    "@context": ["https://www.w3.org/ns/solid/notification/v1"],
                    "type": "http://www.w3.org/ns/solid/notifications#WebSocketChannel2023",
                    "topic": this._sensorContactsUri
                }
            )
        })
        const data = await response.json();
        console.log(data['receiveFrom']);
        this.sensorContainerSocket = new WebSocket(data["receiveFrom"]);
        this.sensorContainerSocket.onmessage = async (notif) => {
            console.log(notif);
            let newContainedResourceUris = await getAllContainedResourcesInDataset(this._sensorContainerResourceUri, this._authFetch);
            if (newContainedResourceUris.length > this._containedSensorResourceUris.length) {
                let newResourceUris = newContainedResourceUris.filter(uri => !this._containedSensorResourceUris.includes(uri))
                // for each new sensor uri, set their agent access to read for each webid
                //    in the sensor contacts cache
                for (const uri of newResourceUris) {
                    for (const iWebId of this.sensorContactsCache) {
                        await universalAccess.setAgentAccess(uri, iWebId!, { read: true, write: false }, { fetch: this._authFetch })
                    }
                }
            }
            this._containedSensorResourceUris = newContainedResourceUris;
        }
        this.sensorContainerSocket.onopen = () => {
            console.log('sensor container socket open!');
        }
    }

    async initSubscribedTopicsSocket() {
        const response = await this._authFetch('http://localhost:3000/.notifications/WebSocketChannel2023/', {
            method: 'POST',
            headers: {
                'content-type': 'application/ld+json',
                'accept': 'application/ld+json'
            },
            body: JSON.stringify(
                {
                    "@context": ["https://www.w3.org/ns/solid/notification/v1"],
                    "type": "http://www.w3.org/ns/solid/notifications#WebSocketChannel2023",
                    "topic": this._sensorContainerResourceUri
                }
            )
        })
        const data = await response.json();
        console.log(data['receiveFrom']);
        this.subscribedTopicsSocket = new WebSocket(data['receiveFrom']);
        this.subscribedTopicsSocket.onmessage = async (notif) => {
            console.log(notif);
            let newSubscribedTopics = await getSolidDataset(this._subscribedTopicsUri, { fetch: this._authFetch });
            let newSubscribedTopicsCache = getThingAll(newSubscribedTopics);
            if (newSubscribedTopicsCache.length < this.subscribedTopicsCache.length) {
                const topicsToUnsubscribe = this.subscribedTopicsCache.filter(s => !newSubscribedTopicsCache.includes(s));
                console.log(topicsToUnsubscribe);
                for (const st of topicsToUnsubscribe) {
                    const { topicName, topicsUri, qos, brokerUri, sensorUri } = extractStringsFromThing(st!);
                    // let topic = str!.split('+')[1];
                    const cacheIdentifier = `${topicsUri}+${topicName}`;
                    console.log(`[cacheIdentifier]: ${cacheIdentifier}`);
                    if (this.mqttClientCache[cacheIdentifier]) {
                        this.mqttClientCache[cacheIdentifier].unsubscribe(topicName!, {}, (err, packet) => {
                            if (err) console.log(err);
                            console.log(packet)
                        })
                    } else {
                        console.log('error: wasn\'t subscribed to this topic in the first place somehow')
                    }
                }
                this.subscribedTopicsCache = this.subscribedTopicsCache.filter(t => !topicsToUnsubscribe.includes(t))
            }
            else if (newSubscribedTopicsCache.length > this.subscribedTopicsCache.length) {
                // filter the new topics
                // console.log('time to subscribe')
                const topicsToSubscribe = newSubscribedTopicsCache.filter(s => !this.subscribedTopicsCache.includes(s))
                // console.log(`[topicsToSubscribe]: `)
                // console.log(topicsToSubscribe)
                for (const st of topicsToSubscribe) {
                    // TODO: also fix this
                    const { topicName, topicsUri, qos, brokerUri, sensorUri } = extractStringsFromThing(st!);
                    const cacheIdentifier = `${topicsUri}+${topicName}`
                    if (this.mqttClientCache[cacheIdentifier]) {
                        this.mqttClientCache[cacheIdentifier].subscribe(topicName!, { qos: Number.parseInt(qos!) as mqtt.QoS }, (err, packet) => {
                            if (err) console.log(err);
                            console.log(packet)
                        })
                        this.mqttClientCache[cacheIdentifier].on('message', (topic, payload, packet) => {
                            console.log(`received ${topic} with data: ${payload.toString()}`)
                        })
                    } else {
                        let targetMqttClient = mqtt.connect(brokerUri!);
                        targetMqttClient.subscribe(topicName!, { qos: Number.parseInt(qos!) as mqtt.QoS }, (err, packet) => {
                            if (err) console.log(err);
                            console.log(packet)
                        })
                        targetMqttClient.on('message', (topic, payload, packet) => {
                            console.log(`received ${topic} with data: ${payload.toString()}`)
                        })
                        this.mqttClientCache[cacheIdentifier] = targetMqttClient;
                    }
                }
                this.subscribedTopicsCache = newSubscribedTopicsCache;
                // console.log(`new subscribed topics: ${subscribedTopicsCache}`)
            } else { }
        }
        this.subscribedTopicsSocket.onopen = () => {
            console.log('subscribed topics socket open!');
        }
    }

    async destroy() {
        console.log(`destroying instance...`)
        this.sensorContactsSocket.close();
        this.sensorContainerSocket.close();
        this.subscribedTopicsSocket.close();

        let s = this.auxStore.map(entry => `${entry}\n`);
        console.log(s);
        console.log(this._dataUriPath.split('/')[1]);
        await fs.writeFile(`naive_${this._dataUriPath.split('/')[1]}.csv`, s, 'utf8');

        this.auxStore = []
        for (const [_k, v] of Object.entries(this.mqttClientCache)) {
            v.end();
        }
        clearInterval(this._intervalId);
        console.log(`all destroyed`)
    }
}