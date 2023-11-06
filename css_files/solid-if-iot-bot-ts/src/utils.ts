import { SolidDataset, Thing, ThingPersisted, createSolidDataset, getContainedResourceUrlAll, getIri, getSolidDataset, getStringNoLocale, getThing, getThingAll, getUrl, saveSolidDatasetAt } from "@inrupt/solid-client";
import { BROKER_URI, DEFAULT_STORAGE_URI, QOS, SENSOR_URI, TOPIC_NAME, TOPIC_URI } from "./constants.js";
import { FOAF } from "@inrupt/vocab-common-rdf";
import { WebsocketNotification } from "@inrupt/solid-client-notifications";
import { Session } from "@inrupt/solid-client-authn-node";

export async function getWebIdGraph(webId: string, fetch: any): Promise<ThingPersisted> {
    const data = await getSolidDataset(webId, { fetch });
    return getThing(data, webId)!;
}

export async function getStorageUri(webId: string, fetch: any, storageUri: string = DEFAULT_STORAGE_URI): Promise<string | null> {
    try {
        const graph = await getWebIdGraph(webId, fetch);
        const storage = getUrl(graph!, storageUri)
        return storage
    } catch (err: any) {
        console.error(err);
        throw new Error(`[getStorageUri] failed to get storage uri: ${err.message}`);
    }
}

export async function getDataOrCreateDataset(dataUri: string, fetch: any): Promise<SolidDataset> {
    try {
        const data = await getSolidDataset(dataUri, { fetch });
        return data;
    } catch (err: any) {
        console.log(`[getDataOrCreateDataset] error occurred, attempting to build new dataset`);
        let newDataset = createSolidDataset();
        try {
            const data = await saveSolidDatasetAt(dataUri, newDataset, { fetch });
            return data;
        } catch (err: any) {
            throw new Error(`[getDataOrCreateDataset] failed to build solid dataset at backup resource: ${err.message}`)
        }
    }
}

export async function getAllThingsInDataset(uri: string, fetch: any) {
    let dataset = await getSolidDataset(uri, { fetch });
    return getThingAll(dataset);
}

export async function getAllThingsWithIri(uri: string, iri: string, fetch: any) {
    const things = await getAllThingsInDataset(uri, fetch);
    return things.map(thing => getIri(thing, iri))
}

export async function getProfile(webId: string, graph: Thing, fetch: any): Promise<ThingPersisted | null> {
    const profileUri = getUrl(graph, FOAF.isPrimaryTopicOf);
    const profile = await getSolidDataset(profileUri!, { fetch });
    const profileWebIdThing = getThing(profile, webId);
    return profileWebIdThing;
}

export async function getAllContainedResourcesInDataset(uri: string, fetch: any): Promise<string[]> {
    let dataset = await getSolidDataset(uri, { fetch });
    return getContainedResourceUrlAll(dataset);
}

export function extractStringsFromThing(mqttThing: any) {
    const topicName = getStringNoLocale(mqttThing, TOPIC_NAME);
    const topicsUri = getStringNoLocale(mqttThing, TOPIC_URI);
    const qos = getStringNoLocale(mqttThing, QOS);
    const brokerUri = getStringNoLocale(mqttThing, BROKER_URI);
    const sensorUri = getStringNoLocale(mqttThing, SENSOR_URI);
    return { topicName, topicsUri, qos, brokerUri, sensorUri };
}

// TODO: add callback params for custon connected and closed events
export function wsNotificationBuilder(uri: string, name: string, session: Session, errorCallback?: (error: any) => void): WebsocketNotification {
    const socket = new WebsocketNotification(
        uri,
        { fetch: session.fetch }
    )
    if (errorCallback) {
        socket.on("error", errorCallback);
    } else {
        socket.on("error", (err: any) => console.error(`${name}: ${err.message}`));
    }
    
    socket.on("connected", () => console.log(`${name} socket connected!`));
    socket.on("closed", () => console.log(`${name} socket closed!`));
    return socket;
}