import { QueryEngine } from '@comunica/query-sparql-file';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


const engine = new QueryEngine();

const sQuery = `
SELECT ?s WHERE {
    ?s ?p ?o
}
`;

const files = await fs.readdir(`${__dirname}`);
const turtleFiles = files.filter(file => file.includes('.ttl'));
console.log(turtleFiles)
const sources = turtleFiles.map(file => file);
console.log(sources);
const bindingsStream = await engine.queryBindings(
    sQuery,
    { sources: sources },
);
console.log('going')
class Store {
    constructor() {
        this.keys = []
    }

    save(key) {
        this.keys.push(key);
    }
}

let vals = new Promise((resolve, reject) => {
    // let ee = new EventEmitter();
    let store = new Store();
    bindingsStream.on('data', (binding) => {
        // console.log(binding.toString()); // Quick way to print bindings for testing
        // Obtaining values
        // console.log(binding.get('s').value);
        // console.log(binding.get('p').value);
        // console.log(binding.get('o').value);
        store.save(binding.get('s').value)
        
    });
    bindingsStream.on("end", () => {
        resolve(store)
    })
});
const store = await vals;

class LineStore {
    constructor() {
        this.keys = []
    }

    save(id, fileNameTxt, o1, o2, o3, o4) {
        this.keys.push(`${id}, ${fileNameTxt}, ${o1}, ${o2},  ${o3}, ${o4}`);
    }
}

let ls = new LineStore();
console.log('starting linestore...')
for (const key of store.keys) {
    // console.log(key)
    const keyArray = key.split("/")
    // console.log(keyArray);
    const keyBlock = keyArray[keyArray.length - 1]
    // const p3 = keyArray[3]
    // const p4 = keyArray[4]
    // let [p5, id] = keyBlock.split('#')
    // const fileNameTtl = p3+p4+p5+'.ttl'
    let [fileNameTtl, id] = keyBlock.split('#')
    // console.log(fileNameTtl)
    let fileNameTxt = fileNameTtl.replace(".ttl", ".txt")

    let query = `
    SELECT ?o1 ?o2 ?o3 ?o4 WHERE {
        <${key}> <https://www.example.org/mqtt#topic> ?o1.
        <${key}> <https://www.example.org/mqtt#payload> ?o2.
        <${key}> <https://www.example.org/hrtime0> ?o3.
        <${key}> <https://www.example.org/hrtime1> ?o4
    }
    `
    // let query = `
    // SELECT * WHERE { ?s ?p ?o }`

    const smallBindingsStream = await engine.queryBindings(
        query,
        { sources: [fileNameTtl] },
    );

    smallBindingsStream.on("data", (binding) => {
        // console.log(`${key}`)
        // console.log(binding.toString())
        // console.log(binding.get("o1").value)
        // console.log(binding.get("o2").value)
        ls.save(id, fileNameTxt, binding.get("o1").value, binding.get("o2").value, binding.get("o3").value, binding.get("o4").value)
    })
    
}
console.log('writing file...')
const fp = await fs.open("ps_css_saved_output.csv", "w")
for (const line of ls.keys) {
    fp.write(`${line}\n`);
}
fp.close();
console.log('done!')