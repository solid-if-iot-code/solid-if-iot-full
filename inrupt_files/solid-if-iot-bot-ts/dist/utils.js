import { createSolidDataset, getContainedResourceUrlAll, getIri, getSolidDataset, getStringNoLocale, getThing, getThingAll, getUrl, saveSolidDatasetAt } from "@inrupt/solid-client";
import { DEFAULT_STORAGE_URI } from "./constants.js";
import { FOAF } from "@inrupt/vocab-common-rdf";
import { WebsocketNotification } from "@inrupt/solid-client-notifications";
export async function getWebIdGraph(webId, fetch) {
    const data = await getSolidDataset(webId, { fetch });
    return getThing(data, webId);
}
export async function getStorageUri(webId, fetch, storageUri = DEFAULT_STORAGE_URI) {
    try {
        const graph = await getWebIdGraph(webId, fetch);
        const storage = getUrl(graph, storageUri);
        return storage;
    }
    catch (err) {
        console.error(err);
        throw new Error(`[getStorageUri] failed to get storage uri: ${err.message}`);
    }
}
export async function getDataOrCreateDataset(dataUri, fetch) {
    try {
        const data = await getSolidDataset(dataUri, { fetch });
        return data;
    }
    catch (err) {
        console.error(`[getDataOrCreateDataset] error occurred, attempting to build new dataset: ${err.message}`);
        let newDataset = createSolidDataset();
        try {
            const data = await saveSolidDatasetAt(dataUri, newDataset, { fetch });
            return data;
        }
        catch (err) {
            throw new Error(`[getDataOrCreateDataset] failed to build solid dataset at backup resource: ${err.message}`);
        }
    }
}
export async function getAllThingsInDataset(uri, fetch) {
    let dataset = await getSolidDataset(uri, { fetch });
    return getThingAll(dataset);
}
export async function getAllThingsWithIri(uri, iri, fetch) {
    const things = await getAllThingsInDataset(uri, fetch);
    return things.map(thing => getIri(thing, iri));
}
export async function getProfile(webId, graph, fetch) {
    const profileUri = getUrl(graph, FOAF.isPrimaryTopicOf);
    const profile = await getSolidDataset(profileUri, { fetch });
    const profileWebIdThing = getThing(profile, webId);
    return profileWebIdThing;
}
export async function getAllContainedResourcesInDataset(uri, fetch) {
    let dataset = await getSolidDataset(uri, { fetch });
    return getContainedResourceUrlAll(dataset);
}
export function extractStringsFromThing(mqttThing) {
    const topicName = getStringNoLocale(mqttThing, 'https://www.example.org/identifier#topicName');
    const topicsUri = getStringNoLocale(mqttThing, 'https://www.example.org/identifier#topicsUri');
    const qos = getStringNoLocale(mqttThing, 'https://www.example.org/identifier#qos');
    const brokerUri = getStringNoLocale(mqttThing, 'https://www.example.org/identifier#brokerUri');
    const sensorUri = getStringNoLocale(mqttThing, 'https://www.example.org/identifier#sensorUri');
    return { topicName, topicsUri, qos, brokerUri, sensorUri };
}
export function wsNotificationBuilder(uri, name, session) {
    const socket = new WebsocketNotification(uri, { fetch: session.fetch });
    socket.on("error", (err) => console.error(`${name}: ${err.message}`));
    socket.on("connected", () => console.log(`${name} socket connected!`));
    socket.on("closed", () => console.log(`${name} socket closed!`));
    return socket;
}
