
const fetch = require('node-fetch');

async function test() {
  const chainId = 97;
  const address = "0x0742C04f14995b988A2A26b170eCe9f05633a5DD";
  const apiBase = "http://localhost:3000";

  console.log(`Testing verification status for ${address} on chain ${chainId}...`);

  try {
    const resp = await fetch(`${apiBase}/api/explorer-getsourcecode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chainId, address }),
    });

    if (!resp.ok) {
        console.error("Response not OK:", resp.status, resp.statusText);
        const text = await resp.text();
        console.error("Body:", text);
        return;
    }

    const js = await resp.json();
    console.log("Response JSON:", JSON.stringify(js, null, 2));
  } catch (e) {
    console.error("Fetch error:", e);
  }
}

test();
