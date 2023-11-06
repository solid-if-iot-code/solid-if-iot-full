import fs from "fs/promises";

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const files = await fs.readdir(__dirname)
const dataFiles = files.filter(file => file.includes(".txt"));
// console.log(dataFiles);

const fp = await fs.open('pushSplice_emitted_output.csv', 'w')
for (const file of dataFiles) {
    // console.log(file);
    let scrap = file.split('pushSplice')[2]
    // console.log(scrap);
    let newName = `pushSplice${scrap}`;
    // console.log(newName)
    const tempFile = await fs.open(file, 'r');
    for await (const line of tempFile.readLines()) {
        // console.log(line)
        const [col2, col1] = line.substring(12).split(',')
        // console.log(`${newName},${col1},${col2}`)
        fp.write(`${newName},${col1},${col2}\n`)
    }
}
fp.close();