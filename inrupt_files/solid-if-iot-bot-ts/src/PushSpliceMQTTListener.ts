import { Session } from "@inrupt/solid-client-authn-node";
import { WebsocketNotification } from "@inrupt/solid-client-notifications";
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
    Thing,
    ThingPersisted
} from "@inrupt/solid-client";
import EventEmitter from "events";
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
    getProfile, 
    getStorageUri, 
    getWebIdGraph, 
    wsNotificationBuilder 
} from "./utils.js";

export class PushSpliceMqttListener {
    // maybe use the store when the streams are getting overwhelming?
    // private auxStore: mqtt.Store;
    private auxStore: string[] = [];
    private dataBuffer: Thing[];
    private counter = 0;
    private shift_counter = 0;
    // private DEFAULT_MAX_PUSH_SHIFT = 192;
    private pushShiftSize;
    private id: string;
    private _initTime: number;
    webId!: string;
    private _storageUri!: string;
    private _dataUri!: string;
    private _session: Session;
    mqttData!: SolidDataset;
    private _sensorContactsUri!: string;
    sensorContactsCache!: string[];
    private _graph!: ThingPersisted;
    private _profile!: ThingPersisted;
    private _sensorContainerResourceUri!: string;
    private _containedSensorResourceUris!: string[];
    private _subscribedTopicsUri!: string;
    private _dataUriPath: string;
    subscribedTopicsDataset!: SolidDataset;
    subscribedTopicsCache!: Readonly<{ type: "Subject"; url: string; predicates: Readonly<Record<string, Readonly<Partial<{ literals: Readonly<Record<string, readonly string[]>>; langStrings: Readonly<Record<string, readonly string[]>>; namedNodes: readonly string[]; blankNodes: readonly (`_:${string}` | Readonly<Record<string, Readonly<Partial<any>>>>)[]; }>>>>; }>[];
    mqttClientCache: { [key:string]: mqtt.MqttClient } = {};
    sensorContactsSocket!: WebsocketNotification;
    sensorContainerSocket!: WebsocketNotification;
    subscribedTopicsSocket!: WebsocketNotification;
    private _emitter: EventEmitter;

    constructor(session: Session, dataUriPath: string, pushShiftSize: number) {
        this._initTime = Date.now();
        this._dataUriPath = dataUriPath;
        this.id = crypto.randomBytes(8).toString('base64url');
        this._session = session;
        // added for push shift
        this.dataBuffer = [];
        // this part for push shift
        this._emitter = new EventEmitter();
        this.pushShiftSize = pushShiftSize;
    };

    async setup
        (
        sensorContactsUriPath: string = DEFAULT_SENSOR_CONTACTS_URI_PATH,
        subscribedTopicsUriPath: string = DEFAULT_SUBSCRIBED_TOPICS_URI_PATH,
        ) {
        this.webId = this._session.info.webId as string;
        this._storageUri = await getStorageUri(this.webId, this._session.fetch) as string
        this._dataUri = this._storageUri + this._dataUriPath;
        this.mqttData = await getDataOrCreateDataset(this._dataUri, this._session.fetch);
        this._sensorContactsUri = this._storageUri + sensorContactsUriPath;
        this.sensorContactsCache = await getAllThingsWithIri(this._sensorContactsUri, DEFAULT_WEBID_CONTACT_IRI, this._session.fetch) as string[];
        this._graph = await getWebIdGraph(this.webId, this._session.fetch);
        this._profile = await getProfile(this.webId, this._graph, this._session.fetch) as ThingPersisted;
        this._sensorContainerResourceUri = getStringNoLocale(this._profile, DEFAULT_SENSOR_CONTAINER_STRING) as string;
        this._containedSensorResourceUris = await getAllContainedResourcesInDataset(this._sensorContainerResourceUri, this._session.fetch);
        this._subscribedTopicsUri = this._storageUri + subscribedTopicsUriPath;
        this.subscribedTopicsDataset = await getSolidDataset(this._subscribedTopicsUri, {fetch: this._session.fetch});
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
            // push shift save
            targetMqttClient.on('message', (topic, payload, packet) => {
                // console.log(`[targetMqttClient] thing with id: ${this.id}_${this.counter}`)
                let newThing = buildThing(createThing({ name: `${this.id}_${this.counter}` }))
                    .addStringNoLocale(DEFAULT_TOPIC_URI, topic)
                    .addStringNoLocale(DEFAULT_PAYLOAD_URI, payload.toString())
                    .addStringNoLocale("https://www.example.org/identifier#time", process.hrtime.bigint().toString())
                    .build()
                this.dataBuffer.push(newThing);
                // console.log(this.dataBuffer.length);
                // this.mqttData = setThing(this.mqttData, newThing);
                this.auxStore.push(payload.toString());
                console.log(this.auxStore.length);
                this.counter++;
                this.shift_counter++;
                if (this.shift_counter == this.pushShiftSize) {
                    console.log('max reached')
                    this._emitter.emit('MaxReached');
                    this.shift_counter = 0;
                }
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

    // push splice save
    async saveOnceMore() {
        console.log('one more save')
        console.log(this.dataBuffer.length);
        const thingArr = this.dataBuffer.splice(0, this.dataBuffer.length);
        console.log(thingArr.length);
        console.log(thingArr[0].predicates.literals);
        for (const thing of thingArr) {
            // console.log('t')
            this.mqttData = setThing(this.mqttData, thing);
        }
        console.log(`dataUri: ${this._dataUri}`);
        try {
            await saveSolidDatasetAt(this._dataUri, this.mqttData, { fetch: this._session.fetch });
            // console.log(r);    
        } catch (err) {
            console.error(err);
        }
    }

    startSavingCycle() {
        this._emitter.addListener('MaxReached',async () => {
            console.log('max reached emitted')
            try {
                const thingArr = this.dataBuffer.splice(0, this.pushShiftSize);
                // console.log(thingArr.length);
                for (const thing of thingArr) {
                    // console.log(thing);
                    this.mqttData = setThing(this.mqttData, thing);
                }
                await saveSolidDatasetAt(this._dataUri, this.mqttData, { fetch: this._session.fetch });
                this.mqttData = await getSolidDataset(this._dataUri, { fetch: this._session.fetch });
            } catch (err) {
                console.error(err);
            }
        })
    }

    setSession(session: Session) {
        this._session = session;
    }

    initSensorContactsSocket() {
        this.sensorContactsSocket = wsNotificationBuilder(this._sensorContactsUri, "[SensorContactsSocket]", this._session);
        this.sensorContactsSocket.on("message", async (notif) => {
            let newSensorContactsCache = await getAllThingsWithIri(this._sensorContactsUri, DEFAULT_WEBID_CONTACT_IRI, this._session.fetch) as string[];
            if (newSensorContactsCache.length > 0) {
                let newSensorContactsWebIds = newSensorContactsCache.filter(contact => !this.sensorContactsCache.includes(contact))
                // for each webId that is new, set their agent access to read for each sensor name 
                //    in the sensor container
                for (const iWebId of newSensorContactsWebIds) {
                    for (const resource of this._containedSensorResourceUris) {
                        await universalAccess.setAgentAccess(resource, iWebId!, { read: true, write: false }, { fetch: this._session.fetch })
                    }
                }
            }
            this.sensorContactsCache = newSensorContactsCache as string[];
        })
        this.sensorContactsSocket.connect();
    }

    initSensorContainerSocket() {
        this.sensorContainerSocket = wsNotificationBuilder(this._sensorContainerResourceUri!, "[SensorContainerSocket]", this._session);
        this.sensorContainerSocket.on("message", async (notif) => {
            let newContainedResourceUris = await getAllContainedResourcesInDataset(this._sensorContainerResourceUri, this._session.fetch);
            if (newContainedResourceUris.length > this._containedSensorResourceUris.length) {
                let newResourceUris = newContainedResourceUris.filter(uri => !this._containedSensorResourceUris.includes(uri))
                // for each new sensor uri, set their agent access to read for each webid
                //    in the sensor contacts cache
                for (const uri of newResourceUris) {
                    for (const iWebId of this.sensorContactsCache) {
                        await universalAccess.setAgentAccess(uri, iWebId!, { read: true, write: false }, { fetch: this._session.fetch })
                    }
                }
            }
            this._containedSensorResourceUris = newContainedResourceUris;
        });
        this.sensorContainerSocket.connect();
    }

    initSubscribedTopicsSocket() {
        this.subscribedTopicsSocket = wsNotificationBuilder(this._subscribedTopicsUri, "[SubscribedTopicsSocket]", this._session);
        this.subscribedTopicsSocket.on("message", async (notif) => {
            let newSubscribedTopics = await getSolidDataset(this._subscribedTopicsUri, { fetch: this._session.fetch });
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
                console.log('time to subscribe')
                const topicsToSubscribe = newSubscribedTopicsCache.filter(s => !this.subscribedTopicsCache.includes(s))
                console.log(`[topicsToSubscribe]: `)
                console.log(topicsToSubscribe)
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
        })
        
        this.subscribedTopicsSocket.connect();
    }

    async destroy() {
        console.log(`destroying instance...`)
        this.sensorContactsSocket.disconnect();
        this.sensorContainerSocket.disconnect();
        this.subscribedTopicsSocket.disconnect();

        let s = this.auxStore.map(entry => `${entry}\n`);
        console.log(s);
        console.log(this._dataUriPath.split('/')[1]);
        await fs.writeFile(`aec_${this._dataUriPath.split('/')[1]}.csv`, s, 'utf8');

        this.auxStore = []
        for (const [k, v] of Object.entries(this.mqttClientCache)) {
            v.end();
        }
        
        console.log(`all destroyed`)
    }
}