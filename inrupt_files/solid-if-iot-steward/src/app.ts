import express, { Express, Request, Response } from "express";
import {
    getSessionFromStorage,
    Session
} from '@inrupt/solid-client-authn-node';
import cookieSession from "cookie-session";
import {
    getSolidDataset,
    getPodUrlAll,
    createSolidDataset,
    buildThing,
    createThing,
    saveFileInContainer,
    getSourceUrl,
    overwriteFile,
    saveSolidDatasetAt,
    addUrl,
    addStringNoLocale,
    addDate,
    setThing,
    saveSolidDatasetInContainer,
    createContainerAt,
    createContainerInContainer,
    getContainedResourceUrlAll,
    getThingAll,
    getStringNoLocale,
    toRdfJsDataset,
    getThing,
    getUrl,
    setUrl,
    setStringNoLocale,
    universalAccess,
    addIri,
    Thing,
    getSolidDatasetWithAcl,
    hasResourceAcl,
    hasFallbackAcl,
    setPublicResourceAccess,
    setAgentResourceAccess,
    createAclFromFallbackAcl,
    saveAclFor
} from '@inrupt/solid-client';
import path from "path";
import * as multer from "multer";
import { randomBytes } from "crypto";
// import { QueryEngine } from "@comunica/query-sparql";
import _ from "lodash";
import { FOAF } from "@inrupt/vocab-common-rdf";
// const myEngine = new QueryEngine();
const upload = multer.default();
const PORT = process.env.PORT || 3001;
const app: Express = express();
//this uses path join with __dirname
//__dirname is the current directory of the executed file, which is necessary for the js file
//after it is compiled into the dist folder from src/app.ts
app.use('/js', express.static(path.join(__dirname, 'public/js')))
app.use(express.json());
app.use(express.urlencoded());
//app.use(bodyParser.urlencoded());
//this sets the views directory for the compiled app.js file in the dist folder after tpyescript has compiled
app.set('views', path.join(__dirname, '/views'))
app.set('view engine', 'pug');
//app.use(cors());
app.use(
    cookieSession({
        name: "session",
        // These keys are required by cookie-session to sign the cookies.
        keys: [
            "Required, but value not relevant for this demo - key1",
            "Required, but value not relevant for this demo - key2",
        ],
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
    })
);

app.get('/', (req: Request, res: Response) => {
    res.render('index.pug')
})

app.post("/login", upload.none(), (req: Request, res: Response) => {
    (req.session as CookieSessionInterfaces.CookieSessionObject).oidcIssuer = req.body.oidcIssuer;
    res.redirect('/login');
})

app.get("/login", async (req: Request, res: Response) => {
    const session = new Session();
    const oidcIssuer = (req.session as CookieSessionInterfaces.CookieSessionObject).oidcIssuer;
    (req.session as CookieSessionInterfaces.CookieSessionObject).sessionId = session.info.sessionId;
    const redirectToSolidIdentityProvider = (url: string) => {
        res.redirect(url);
    };
    try {
        await session.login({
            redirectUrl: `http://localhost:${PORT}/redirect-from-solid-idp`,
            oidcIssuer: oidcIssuer,
            clientName: "SOLID-if-IoT Steward App",
            handleRedirect: redirectToSolidIdentityProvider,
        });
    } catch (err) {
        res.redirect('/');
    }
});

app.get("/redirect-from-solid-idp", async (req: Request, res: Response) => {
    const session = await getSessionFromStorage((req.session as CookieSessionInterfaces.CookieSessionObject).sessionId);

    await (session as Session).handleIncomingRedirect(`http://localhost:${PORT}${req.url}`);

    if ((session as Session).info.isLoggedIn) {
        res.redirect('/home');
    }
});

app.get('/home', async (req: Request, res: Response) => {
    const session = await getSessionFromStorage((req.session as CookieSessionInterfaces.CookieSessionObject).sessionId);
    if (session) {
        res.render('home.pug')
    } else {
        res.render('error.pug')
    }
})

app.get('/create_sensor', async (req: Request, res: Response) => {
    const session = await getSessionFromStorage((req.session as CookieSessionInterfaces.CookieSessionObject).sessionId);
    if (session) {
        res.render('inspect.pug')
    } else {
        res.render('error.pug')
    }
})

function genRandomToken() {
    return randomBytes(64).toString('hex');
}

async function getSensorInboxResource(session: Session, webId: string): Promise<string | null> {
    //const webId = session.info.webId!;
    let dataset = await getSolidDataset(webId, { fetch: session.fetch });
    const rdfThing = getThing(dataset, webId);
    const profileUri = getUrl(rdfThing!, FOAF.isPrimaryTopicOf);
    // dereference profile document w/ uri
    let profileDataset = await getSolidDataset(profileUri!, { fetch: session.fetch });
    // query the dataset for the user card 
    const extWebID = getThing(profileDataset, webId);
    const sensorInboxUri = getStringNoLocale(extWebID!, 'http://www.example.org/sensor#sensorInbox');
    return sensorInboxUri;
}

function buildSensorInfoThing(webId: string, sensorName: string, sensorUri: string, brokerUri: string, topicsUri: string) {
    let sensorThing = buildThing(createThing({ name: sensorName }))
        .addIri("https://www.example.org/webId", webId)
        .addStringNoLocale('https://www.example.org/sensor#sensorUri', sensorUri)
        .addIri('https://www.example.org/sensor#brokerUri', brokerUri)
        .addStringNoLocale('https://www.example.org/sensor#name', sensorName)
        .addIri('https://www.example.org/sensor#topicsUri', topicsUri)
        .build();

    return sensorThing;
}

function buildThingsDictWithSecretKey(sensorThing: any, webIds: Array<string>) {
    let keyThings: any = {}
    for (const webId of webIds) {
        const key = genRandomToken();
        let newThing = setStringNoLocale(sensorThing, 'https://www.example.com/key#secure', key);
        keyThings[webId] = newThing;
    }
    console.log(`made kethings: ${keyThings}`)
    return keyThings;
}

async function getStorageUri(session: Session) {
    const webId = session.info.webId!;
    if (webId.includes('profile/card#me')) {
        let newUri = webId.split('/profile/card#me')[0];
        console.log(newUri);
        return newUri;
    }
    console.log(webId);
    const webIdData = await getSolidDataset(webId, { fetch: session.fetch })
    console.log(webIdData);
    const webIdDoc = getThing(webIdData, webId);
    console.log(webIdDoc);
    const storageUri = getUrl(webIdDoc!, 'http://www.w3.org/ns/pim/space#storage');
    return storageUri;
}

async function setAccessForWebIdsAtUrl(session: Session, urls: Array<string>, webIds: Array<string>) {
    console.log('setting access')
    // i swear to god if i need to do this
    for (const url of urls) {
        let newAccess;
        try {
                newAccess = await universalAccess.setAgentAccess(url, session.info.webId as string, { read: true, write: false }, { fetch: session.fetch })
        } catch (err) {
            // this should probably be a function
            let dataset = await getSolidDatasetWithAcl(url, { fetch: session.fetch});
            let aclDataset;
            if (!hasResourceAcl(dataset)) {
                if (!hasFallbackAcl(dataset)) {
                    // @ts-ignore
                    aclDataset = createAcl(dataset);
                }
                // @ts-ignore
                aclDataset = createAclFromFallbackAcl(dataset);
                // might need to be setPublicDefaultAccess
                aclDataset = setPublicResourceAccess(aclDataset, { read: false, append: false, write: false, control: false });
                aclDataset = setAgentResourceAccess(aclDataset, session.info.webId as string, { read: true, write: true, append: true, control: true });
                // @ts-ignore
                newAccess = await saveAclFor(dataset, aclDataset, {fetch: session.fetch});
            }
            console.log(`set access for ${session.info.webId as string} to ${url}`);
        }
    }
    try {
        for (const webId of webIds) {
            console.log(webId);
            for (const url of urls) {
                // bug here
                let newAccess;
                try {
                    console.log('should never leave here')
                     newAccess = await universalAccess.setAgentAccess(url, webId, { read: true, write: false }, { fetch: session.fetch })
                } catch (err) {
                    console.log('somehow we got here')
                    // this should probably be a function
                    let dataset = await getSolidDatasetWithAcl(url, { fetch: session.fetch});
                    let aclDataset;
                    if (!hasResourceAcl(dataset)) {
                        if (!hasFallbackAcl(dataset)) {
                            // @ts-ignore
                            aclDataset = createAcl(dataset);
                        }
                        // @ts-ignore
                        aclDataset = createAclFromFallbackAcl(dataset);
                        aclDataset = setAgentResourceAccess(aclDataset, webId, { read: true, write: false, append: false, control: false });
                        // @ts-ignore
                        newAccess = await saveAclFor(dataset, aclDataset, {fetch: session.fetch});
                    }
                    console.log(`set access for ${webId} to ${url} as ${String(newAccess)}`);
                }
                
            }
        }
    } catch (err: any) {
        console.log(err);
        throw new Error(err.message)
    }
}

type Topic = {
    topicName: string;
    topicType: 'publish' | 'subscribe';
    qos: '0' | '1' | '2';
}

function buildTopicsThing(topics: Array<Topic>) {
    let topicsThing = buildThing(createThing()).build();
    for (const topic of topics) {
        if (topic.topicType === 'publish') {
            topicsThing = addStringNoLocale(topicsThing, 'https://www.example.org/sensor#publishTopic', topic.topicName);

        } else {
            topicsThing = addStringNoLocale(topicsThing, 'https://www.example.org/sensor#subscribeTopic', topic.topicName);
            topicsThing = addStringNoLocale(topicsThing, 'https://www.example.org/sensor#qos', topic.qos);
        }
    }
    // console.log(`[buildTopicsThing]: ${topicsThing}`);
    return topicsThing;
}

function saveInWebIds(webIds: Array<string>, session: Session, keyThings: any): Promise<number> {
    return new Promise((res, rej) => {
        for (const webId of webIds) {
            let newData = createSolidDataset();
            newData = setThing(newData, keyThings[webId])
            getSensorInboxResource(session, webId)
                .then((sensorInboxUri) => {
                    saveSolidDatasetInContainer(sensorInboxUri as string, newData, { fetch: session.fetch })
                })
                .catch((err) => {
                    console.error(err);
                    rej(404)
                })
        }
        res(200)
    })
}

// this is if you have read and write access
async function saveAndUpdateDatasetWithThing(newUri: string, thing: any, session: Session): Promise<boolean | Error> {
    console.log(`in here: ${newUri}`)
    let dataset = await getSolidDataset(newUri, { fetch: session.fetch });
    console.log('out here')
    console.log(dataset);
    dataset = setThing(dataset, thing);
    return new Promise((resolve, reject) => {
        saveSolidDatasetAt(newUri, dataset, { fetch: session.fetch })
            .then(data => {
                console.log(`[saveAndUpdateDatasetWithThing] ${data}`);
                resolve(true)
            })
            .catch(err => {
                console.log(err)
                reject(false)
            })
    })
}

function buildPermittedThing(webIds: Array<string>) {
    let thing = buildThing(createThing()).build();
    for (const webId of webIds) {
        thing = addIri(thing, "https://www.example.org/permitted#webId", webId)
    }
    return thing;
}

app.post('/add_sensor', async (req: Request, res: Response) => {
    const session = await getSessionFromStorage((req.session as CookieSessionInterfaces.CookieSessionObject).sessionId)
    if (session) {
        console.log(req.body)
        // res.status(200).send();
        try {
            const storageUri = await getStorageUri(session)
            console.log('storage')
            const { sensorName, webIds, sensorUri, brokerUri, topics } = req.body;
            console.log('parse')
            const publicContainerUri = `${storageUri}public/`
            const sensorsContainerUri = `${publicContainerUri}sensors/`
            const newSensorContainerUri = `${sensorsContainerUri}${sensorName}/`
            console.log('container')
            const newSensorInfoUri = `${newSensorContainerUri}info`;
            console.log(newSensorInfoUri)
            const newSensorTopicsUri = `${newSensorContainerUri}topics`;
            console.log(newSensorTopicsUri)


            const newSensorPermittedUri = `${newSensorContainerUri}permitted`
            //let data = createSolidDataset();
            try {
                await getSolidDataset(newSensorPermittedUri, { fetch: session.fetch })
                console.log(`${newSensorInfoUri} exists`)
            } catch (err) {
                console.log(err)
                let newData = createSolidDataset();
                try {
                    await saveSolidDatasetAt(newSensorPermittedUri, newData, { fetch: session.fetch })
                    console.log(`created newSensorPermittedUri`)
                } catch (err) {
                    console.log('fatal error 1')
                    res.redirect('/error')
                }
            }
            try {
                await getSolidDataset(newSensorInfoUri, { fetch: session.fetch })
                console.log(`${newSensorInfoUri} exists`)
            } catch (err) {
                console.log(err)
                let newData = createSolidDataset();
                try {
                    await saveSolidDatasetAt(newSensorInfoUri, newData, { fetch: session.fetch })
                    console.log(`created newSensorInfoUri`)
                } catch (err) {
                    console.log('fatal error 1')
                    res.redirect('/error')
                }
            }
            try {
                await getSolidDataset(newSensorTopicsUri, { fetch: session.fetch })
                console.log(`${newSensorTopicsUri} exists`)
            } catch (err) {
                console.log(err)
                let newData = createSolidDataset();
                try {
                    await saveSolidDatasetAt(newSensorTopicsUri, newData, { fetch: session.fetch })
                    console.log(`created newSensorTopicsUri`);
                } catch (err) {
                    console.log('fatal err')
                    res.redirect('/error')
                }
            }
            // split on multiple inputs
            let webIdArr = webIds.split(',');
            await setAccessForWebIdsAtUrl(session, [newSensorInfoUri, newSensorTopicsUri], webIdArr);
            console.log('set webid access');
            let success: boolean | Error;

            let topicsThing = buildTopicsThing(topics)
            success = await saveAndUpdateDatasetWithThing(newSensorTopicsUri, topicsThing, session)
            if (!success) { 
                console.error(`failed to save ${newSensorTopicsUri}`)} 
            else {
                console.log(`saved ${newSensorTopicsUri}`)
            }

            let sensorThing = buildSensorInfoThing(session.info.webId!, sensorName, sensorUri, brokerUri, newSensorTopicsUri);
            success = await saveAndUpdateDatasetWithThing(newSensorInfoUri, sensorThing, session)
            if (!success) {
                throw new Error(`failed to save ${newSensorInfoUri}`)
            } else {
                console.log('built sensor info thing');
            }
            
            let permittedThing = buildPermittedThing(webIdArr);
            success = await saveAndUpdateDatasetWithThing(newSensorPermittedUri, permittedThing, session);
            if (!success) {
                throw new Error(`failed to save ${newSensorPermittedUri}`)
            } else {
                console.log('built permitted thing');
            }            
            let keyThings = buildThingsDictWithSecretKey(sensorThing, webIdArr);
            const resCode = await saveInWebIds(webIdArr, session, keyThings);
            console.log(`made it to end: ${resCode}`);
            // res.send();
            res.redirect('/home');
            //may see an error after response due to saveInWebIds attempting to save information at a client's inbox that has not made it write-able to the steward
        } catch (err) {
            res.redirect('/error');
        }
        // res.redirect('/home');
    } else {
        res.redirect('/error')
    }
})

app.get('/error', (req: Request, res: Response) => {
    res.render('error.pug');
});

app.get('/logout', async (req: Request, res: Response) => {
    if (typeof req.session === undefined || typeof req.session === null) {
        res.render('error.pug')
    } else {
        const session = await getSessionFromStorage((req.session as CookieSessionInterfaces.CookieSessionObject).sessionId)
        if (session?.info.isLoggedIn) {
            await session.logout();
        }
        res.render('logged_out.pug')
    }
})

app.listen(PORT, () => {
    console.log(`Server started on port: ${PORT}`)
})