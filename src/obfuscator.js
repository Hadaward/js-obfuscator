import { generateCryptoFor, getIdentifiers } from "./obfutils.js";
import { readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { extname } from "node:path";
import { tokenize } from "esprima";
import { minify } from "minify";

async function obfuscateStrings(strings, input, cryptoKeyLength) {
    const data = [];

    for (const str of strings) {
        data.push({
            token: str,
            raw: str.substring(1, str.length - 1)
        })
    }

    for (const str of data) {
        let identifier = randomBytes(16).toString('hex');

        if (/^\d/.test(identifier))
            identifier = `_${identifier}`;

        const encrypted = await generateCryptoFor(str.raw, cryptoKeyLength);
        input.output += `const ${identifier} = D(await T(O, await V(J,${JSON.stringify(encrypted.exportedKey)},O,F,Y), new U(${JSON.stringify(encrypted.encryptedValueArray)}).buffer));`
        input.data = input.data.replace(new RegExp(str.token, 'g'), identifier);
    }
}

async function obfuscateIdentifiers(identifiers, input, cryptoKeyLength) {
    const ids = new Map();

    for (const identifier of identifiers) {
        if (identifier.isConstructor)
            continue;

        if (!ids.has(identifier.value)) {
            let name = randomBytes(16).toString('hex');

            if (/^\d/.test(name))
                name = `_${name}`;

            ids.set(identifier.value, {
                name,
                crypto: await generateCryptoFor(identifier.value, cryptoKeyLength),
                isDeclared: false,
                addedToOut: false
            });
        }

        const encrypted = ids.get(identifier.value);

        if (identifier.declaration) {
            encrypted.isDeclared = true;
            input.data = input.data.replace(new RegExp(`${identifier.declarationKey}[\\s]+${identifier.value}`, 'g'), `${identifier.declarationKey} ${encrypted.name}`);
        }

        if (!encrypted.addedToOut && !encrypted.isDeclared) {
            input.output += `const ${encrypted.name} = W[D(await T(O,await V(J,${JSON.stringify(encrypted.crypto.exportedKey)},O,F,Y),new U(${JSON.stringify(encrypted.crypto.encryptedValueArray)}).buffer))];`;
            input.output += `const ${encrypted.name}_C = D(await T(O,await V(J,${JSON.stringify(encrypted.crypto.exportedKey)},O,F,Y),new U(${JSON.stringify(encrypted.crypto.encryptedValueArray)}).buffer));`;
            encrypted.addedToOut = true;
        }

        if (!encrypted.isDeclared) {
            if (identifier.chain) {
                input.data = input.data.replace(new RegExp(`(?<!['"])\\.\\b(${identifier.value})\\b(?!['"])`, 'g'), `[${encrypted.name}_C]`);
            } else {
                input.data = input.data.replace(new RegExp(`(?<!['"])\\b(${identifier.value})\\b(?!['"])`, 'gi'), `${encrypted.name}`);
            }
        } else {
            input.data = input.data.replace(new RegExp(`(?<!['"])\\b(${identifier.value})\\b(?!['"])`, 'gi'), `${encrypted.name}`);
        }
    }
}

export async function readFileAndObfuscate(options) {
    const input = {
        data: await readFile(options.file, 'utf-8'),
        output: `'use strict';(async function(){const _D=new TextDecoder('utf-8');const D=_D.decode.bind(_D),O={name:"RSA-OAEP",hash:"SHA-256"},J='jwk',F=false,W=window,Y=["decrypt"],U=Uint8Array,T=crypto.subtle.decrypt.bind(crypto.subtle),V=crypto.subtle.importKey.bind(crypto.subtle);`
    }

    const tokens = tokenize(input.data, {
        tolerant: true
    });

    if (options.string)
        await obfuscateStrings(new Set(tokens.filter(token => token.type == 'String').map(token => token.value)), input, options.keyLength);

    if (options.identifier)
        await obfuscateIdentifiers(getIdentifiers(tokens), input, options.keyLength);
    
    if (!options.output) {
        const ext = extname(options.file);
        options.output = options.file.substring(0, options.file.length - ext.length) + '.obf' + ext;
    }
    
    await writeFile(options.output, `${input.output}${input.data}})();`);

    try {
        const data = await minify(options.output);
        await writeFile(options.output, data);
    } catch(error) {
        console.error(error);
    }
}