import { connect } from "mqtt";
import fs from "fs/promises";
import { setTimeout as flatTimeout } from "timers/promises"
// console.log('wait');
console.log(process.argv[2])
await flatTimeout(10000);
// console.log('go')

let storage: string[] = [];

const client = connect('mqtt://localhost:1883', {
    clientId: 'client1',
});
const client2 = connect('mqtt://localhost:1883', {
    clientId: 'client2',
});
const client3 = connect('mqtt://localhost:1883', {
    clientId: 'client3',
});
const client4 = connect('mqtt://localhost:1883', {
    clientId: 'client4',
});
const client5 = connect('mqtt://localhost:1883', {
    clientId: 'client5',
});

let c1_counters = [0, 0, 0, 0, 0];
let c2_counters = [0, 0, 0, 0, 0];
let c3_counters = [0, 0, 0, 0, 0];
let c4_counters = [0, 0, 0, 0, 0];
let c5_counters = [0, 0, 0, 0, 0];

const client1_emit_intervals = [1000, 2000, 3000, 4000, 5000];
const client2_emit_intervals = [6000, 7000, 8000, 9000, 10000];
const client3_emit_intervals = [11000, 12000, 13000, 14000, 15000];
const client4_emit_intervals = [16000, 17000, 18000, 19000, 20000];
const client5_emit_intervals = [21000, 22000, 23000, 24000, 25000];

client.on('connect', function () {
    setInterval(() => {
        let m = `presence11_${c1_counters[0].toString()}_${process.hrtime.bigint()}`;
        client.publish('presence11', m);
        storage.push(m);
        c1_counters[0]++;
    }, client1_emit_intervals[0]);
    setInterval(() => {
        let m = `presence12_${c1_counters[1].toString()}_${process.hrtime.bigint()}`;
        client.publish('presence12', m);
        storage.push(m);
        c1_counters[1]++;
    }, client1_emit_intervals[1]);
    setInterval(() => {
        let m = `presence13_${c1_counters[2].toString()}_${process.hrtime.bigint()}`;
        client.publish('presence13', m);
        storage.push(m);
        c1_counters[2]++;
    }, client1_emit_intervals[2]);
    setInterval(() => {
        let m = `presence14_${c1_counters[3].toString()}_${process.hrtime.bigint()}`;
        client.publish('presence14', m);
        storage.push(m);
        c1_counters[3]++;
    }, client1_emit_intervals[3]);
    setInterval(() => {
        let m = `presence15_${c1_counters[4].toString()}_${process.hrtime.bigint()}`;
        client.publish('presence15', m);
        storage.push(m);
        c1_counters[4]++;
    }, client1_emit_intervals[4]);
})

client.on('message', function (topic, message) {
    // message is Buffer
    console.log(topic)
    console.log(message.toString())
    client.end()
})

client2.on('connect', function () {
    setInterval(() => {
        let m = `presence21_${c2_counters[0].toString()}_${process.hrtime.bigint()}`;
        client2.publish('presence21', m);
        storage.push(m)
        c2_counters[0]++;

    }, client2_emit_intervals[0]);
    setInterval(() => {
        let m = `presence22_${c2_counters[1].toString()}_${process.hrtime.bigint()}`;
        client2.publish('presence22', m);
        storage.push(m);
        c2_counters[1]++;
    }, client2_emit_intervals[1]);
    setInterval(() => {
        let m = `presence23_${c2_counters[2].toString()}_${process.hrtime.bigint()}`
        client2.publish('presence23', m);
        storage.push(m);
        c2_counters[2]++;
    }, client2_emit_intervals[2]);
    setInterval(() => {
        let m = `presence24_${c2_counters[3].toString()}_${process.hrtime.bigint()}`
        client2.publish('presence24', m);
        storage.push(m);
        c2_counters[3]++;
    }, client2_emit_intervals[3]);
    setInterval(() => {
        let m = `presence25_${c2_counters[4].toString()}_${process.hrtime.bigint()}`
        client2.publish('presence25', m);
        storage.push(m);
        c2_counters[4]++;
    }, client2_emit_intervals[4]);
})

client2.on('message', function (topic, message) {
    // message is Buffer
    console.log(topic)
    console.log(message.toString())
    client.end()
})

client3.on('connect', function () {
    setInterval(() => {
        let m = `presence31_${c3_counters[0].toString()}_${process.hrtime.bigint()}`;
        client3.publish('presence31', m);
        storage.push(m);
        c3_counters[0]++;
    }, client3_emit_intervals[0]);
    setInterval(() => {
        let m = `presence32_${c3_counters[1].toString()}_${process.hrtime.bigint()}`
        client3.publish('presence32', m);
        storage.push(m);
        c3_counters[1]++;
    }, client3_emit_intervals[1]);
    setInterval(() => {
        let m = `presence33_${c3_counters[2].toString()}_${process.hrtime.bigint()}`
        client3.publish('presence33', m);
        storage.push(m);
        c3_counters[2]++;
    }, client3_emit_intervals[2]);
    setInterval(() => {
        let m = `presence34_${c3_counters[3].toString()}_${process.hrtime.bigint()}`
        client3.publish('presence34', m);
        storage.push(m);
        c3_counters[3]++;
    }, client3_emit_intervals[3]);
    setInterval(() => {
        let m = `presence35_${c3_counters[4].toString()}_${process.hrtime.bigint()}`
        client3.publish('presence35', m);
        storage.push(m);
        c3_counters[4]++;
    }, client3_emit_intervals[4]);
})

client3.on('message', function (topic, message) {
    // message is Buffer
    console.log(topic)
    console.log(message.toString())
    client.end()
})

client4.on('connect', function () {    
    setInterval(() => {
        let m = `presence41_${c4_counters[0].toString()}_${process.hrtime.bigint()}`
        client4.publish('presence41', m);
        storage.push(m);
        c4_counters[0]++;
    }, client4_emit_intervals[0]);
    setInterval(() => {
        let m = `presence42_${c4_counters[1].toString()}_${process.hrtime.bigint()}`
        client4.publish('presence42', m);
        storage.push(m);
        c4_counters[1]++;
    }, client4_emit_intervals[1]);
    setInterval(() => {
        let m = `presence43_${c4_counters[2].toString()}_${process.hrtime.bigint()}`
        client4.publish('presence43', m);
        storage.push(m);
        c4_counters[2]++;
    }, client4_emit_intervals[2]);
    setInterval(() => {
        let m = `presence44_${c4_counters[3].toString()}_${process.hrtime.bigint()}`
        client4.publish('presence44', m);
        storage.push(m);
        c4_counters[3]++;
    }, client4_emit_intervals[3]);
    setInterval(() => {
        let m = `presence45_${c4_counters[4].toString()}_${process.hrtime.bigint()}`
        client4.publish('presence45', m);
        storage.push(m);
        c4_counters[4]++;
    }, client4_emit_intervals[4]);
})

client4.on('message', function (topic, message) {
    // message is Buffer
    console.log(topic)
    console.log(message.toString())
    client.end()
})

client5.on('connect', function () {
    setInterval(() => {
        let m = `presence51_${c5_counters[0].toString()}_${process.hrtime.bigint()}`
        client5.publish('presence51', m);
        storage.push(m);
        c5_counters[0]++;
    }, client5_emit_intervals[0]);
    setInterval(() => {
        let m = `presence52_${c5_counters[1].toString()}_${process.hrtime.bigint()}`
        client5.publish('presence52', m);
        storage.push(m);
        c5_counters[1]++;
    }, client5_emit_intervals[1]);
    setInterval(() => {
        let m = `presence53_${c5_counters[2].toString()}_${process.hrtime.bigint()}`
        client5.publish('presence53', m);
        storage.push(m);
        c5_counters[2]++;
    }, client5_emit_intervals[2]);
    setInterval(() => {
        let m = `presence54_${c5_counters[3].toString()}_${process.hrtime.bigint()}`
        client5.publish('presence54', m);
        storage.push(m);
        c5_counters[3]++;
    }, client5_emit_intervals[3]);
    setInterval(() => {
        let m = `presence55_${c5_counters[4].toString()}_${process.hrtime.bigint()}`
        client5.publish('presence55', m);
        storage.push(m);
        console.log(storage.length);
        c5_counters[4]++;
    }, client5_emit_intervals[4]);
})

client5.on('message', function (topic, message) {
    // message is Buffer
    console.log(topic)
    console.log(message.toString())
    client.end()
})

setTimeout(async () => {
    client.end();
    let s = storage.map(entry => `${entry}\n`);
    console.log(s);
    await fs.writeFile(process.argv[2], s, 'utf8');
    process.exit(0);

}, 240000)