import Aedes, { Client } from 'aedes';
import { createServer } from 'net';
import fs from "fs";

const targetTopics = [
    'presence11', 'presence12', 'presence13', 'presence14', 'presence15',
    'presence21', 'presence22', 'presence23', 'presence24', 'presence25',
    'presence31', 'presence32', 'presence33', 'presence34', 'presence35',
    'presence41', 'presence42', 'presence43', 'presence44', 'presence45',
    'presence51', 'presence52', 'presence53', 'presence54', 'presence55',
]
const testClients = ['client1', 'client2', 'client3', 'client4', 'client5'];
const PORT = 1883;

const aedes = new Aedes();
const server = createServer(aedes.handle);

let dataSent: string[] = [];
let targetClient: string;
let publishSet = false;

aedes.on('client', (client: Client) => {
    console.log(client.id);
    if (!testClients.includes(client.id) && !publishSet) {
        //const timeStart = Date.now();
        targetClient = client.id;
        publishSet = true;
        aedes.on('publish', (packet) => {
            if (targetTopics.includes(packet.topic)) {
                let o = `packet data: ${packet.payload}, ${packet.topic.toString()}`
                console.log(o);
                dataSent.push(o);
            }
        })
    }
})
// console.log(process.argv)


aedes.on('clientDisconnect', (client: Client) => {
    console.log(client.id);
    if (client.id === targetClient) {
        let file = fs.createWriteStream(process.argv[2]);
        
        file.on('error', (err: any) => console.error(err));
        dataSent.forEach(d => file.write(d + '\n'))
        file.end();
        file.close();
        console.log('done!')
        aedes.removeAllListeners();
        aedes.close();
        server.close();
        // aedes.removeListener('publish', () => console.log(`removed publish`));
    }
})

server.listen(PORT, () => {
    console.log(`server started on port: ${PORT}`)
    console.log(process.argv);
})