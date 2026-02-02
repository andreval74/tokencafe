
const fetch = require('node-fetch');

const API_KEY = "I33WZ4CVTPWDG3VEJWN36TQ9USU9QUBVX5";
const ADDRESS = "0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee";

async function testLegacy() {
    const url = `https://api-testnet.bscscan.com/api?module=contract&action=getsourcecode&address=${ADDRESS}&apikey=${API_KEY}`;
    console.log("Testing Legacy:", url);
    try {
        const resp = await fetch(url);
        const json = await resp.json();
        console.log("Legacy Status:", json.status);
        console.log("Legacy Message:", json.message);
        console.log("Legacy Result:", json.result);
        if (json.result && json.result[0]) {
             console.log("Legacy ContractName:", json.result[0].ContractName);
        }
    } catch (e) {
        console.error("Legacy Error:", e.message);
    }
}

async function testV2() {
    const url = `https://api-testnet.bscscan.com/v2/api?chainid=97&module=contract&action=getsourcecode&address=${ADDRESS}&apikey=${API_KEY}`;
    console.log("Testing V2:", url);
    try {
        const resp = await fetch(url);
        if (!resp.ok) {
             console.log("V2 HTTP Status:", resp.status);
             return;
        }
        const text = await resp.text();
        try {
            const json = JSON.parse(text);
            console.log("V2 Status:", json.status);
            console.log("V2 Message:", json.message);
             if (json.result && json.result[0]) {
                 console.log("V2 ContractName:", json.result[0].ContractName);
            }
        } catch (e) {
            console.log("V2 Response is not JSON:", text.substring(0, 100));
        }
    } catch (e) {
        console.error("V2 Error:", e.message);
    }
}

async function testUnifiedV2() {
    const url = `https://api.etherscan.io/v2/api?chainid=97&module=contract&action=getsourcecode&address=${ADDRESS}&apikey=${API_KEY}`;
    console.log("Testing Unified V2:", url);
    try {
        const resp = await fetch(url);
        if (!resp.ok) {
             console.log("Unified V2 HTTP Status:", resp.status);
             const text = await resp.text();
             console.log("Unified V2 Error Body:", text);
             return;
        }
        const json = await resp.json();
        console.log("Unified V2 Status:", json.status);
        console.log("Unified V2 Message:", json.message);
        if (json.result && json.result[0]) {
             console.log("Unified V2 ContractName:", json.result[0].ContractName);
        } else {
             console.log("Unified V2 Result:", json.result);
        }
    } catch (e) {
        console.error("Unified V2 Error:", e.message);
    }
}

async function run() {
    // await testLegacy();
    // console.log("---");
    // await testV2();
    // console.log("---");
    await testUnifiedV2();
}

run();
