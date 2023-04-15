import { Command } from "commander";
import { readFileAndObfuscate } from "./obfuscator.js";

const program = new Command();

program
    .name('JS Obfuscator')
    .description('CLI to obfuscate JavaScript files')
    .version('0.0.1');

program.option('-f, --file <string>', 'file to obfuscate');
program.option('-kl, --keyLength <integer>', 'crypto key length');
program.option('-id, --identifier', 'obfuscate identifiers');
program.option('-s, --string', 'obfuscate strings');
program.option('-o, --output <string>', 'output file');

program.parse();

const option = program.opts();

await readFileAndObfuscate(option);