import { subtle } from "node:crypto";

export async function generateCryptoFor(value, cryptoKeyLength = 4096) {
    let key = await subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: Number(cryptoKeyLength),
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"]
    );
    
    const encryptedValue = await subtle.encrypt(
        {
            "name": "RSA-OAEP"
        },
        key.publicKey,
        value
    )

    return {
        key,
        encryptedValue,
        value,
        exportedKey: await subtle.exportKey('jwk', key.privateKey),
        encryptedValueArray: Array.from(new Uint8Array(encryptedValue))
    }
}

export function getIdentifiers(tokens) {
    const identifiers = [];
    
    for (let i=0; i<tokens.length; i++) {
        const token = tokens[i];

        if (token.type === 'Identifier') {
            const id = {value: token.value, declaration: false, declarationKey: "", chain: false, isConstructor: false};
            
            if (i > 0) {
                const previous = tokens[i - 1];
                
                if (previous.type === 'Keyword' && ['const', 'var', 'let', 'function', 'class'].includes(previous.value)) {
                    id.declaration = true;
                    id.declarationKey = previous.value;
                } else if (previous.type === 'Punctuator' && previous.value === '.') {
                    id.chain = true;
                }
            }

            if (i + 1 < tokens.length - 1 && token.value === 'constructor') {
                const next = tokens[i + 1];

                if (next.type === 'Punctuator' && next.value == '(') {
                    id.isConstructor = true;
                }
            }

            identifiers.push(id);
        }
    }

    return identifiers;
}