const request = require("supertest");
jest.mock("solc", () => ({
  compile: (inputStr) => {
    const input = JSON.parse(inputStr);
    const file = Object.keys(input.sources)[0];
    const contractName = Object.keys(JSON.parse(inputStr).sources)[0].replace(".sol", "");
    const name = contractName;
    const output = {
      contracts: {
        [file]: {
          [name]: {
            abi: [],
            evm: {
              bytecode: { object: "0x6001600155" },
              deployedBytecode: { object: "0x6001600155deployed" },
            },
          },
        },
      },
      errors: [],
    };
    return JSON.stringify(output);
  },
}));

const app = require("../server");

describe("TokenCafe API", () => {
  it("GET /health deve responder com sucesso", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("features");
  });

  it("POST /api/compile-only erro quando faltam campos", async () => {
    const res = await request(app).post("/api/compile-only").send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("POST /api/compile-only compila com solc mockado", async () => {
    const sourceCode = "pragma solidity ^0.8.26; contract T { }";
    const res = await request(app).post("/api/compile-only").send({ sourceCode, contractName: "T", optimization: true });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.compilation).toHaveProperty("abi");
    expect(res.body.compilation).toHaveProperty("bytecode");
  });

  it("POST /api/generate-token erro para totalSupply inválido", async () => {
    const res = await request(app).post("/api/generate-token").send({ name: "X", symbol: "X", totalSupply: "abc" });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("POST /api/generate-token sucesso", async () => {
    const res = await request(app).post("/api/generate-token").send({ name: "Cafe", symbol: "CAF", totalSupply: 1000, decimals: 18 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.compilation).toHaveProperty("abi");
    expect(res.body.compilation).toHaveProperty("bytecode");
    expect(res.body.token).toHaveProperty("contractName");
  });
});
