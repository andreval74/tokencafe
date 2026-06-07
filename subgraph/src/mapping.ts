import { BigInt, Bytes, dataSource } from "@graphprotocol/graph-ts";
import { TokenCreated } from "../generated/TokenCafeFactory/TokenCafeFactory";
import { Token, DailyStat, Creator } from "../generated/schema";
import { TokenCafeERC20 } from "../generated/templates";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Converte timestamp Unix (segundos) em string YYYY-MM-DD */
function timestampToDateStr(timestamp: BigInt): string {
    const unixSec = timestamp.toI64();
    const totalDays = unixSec / 86400;
    // Algoritmo civil de Richards para converter dias desde epoch → YYYY-MM-DD
    const z   = totalDays + 719468;
    const era = (z >= 0 ? z : z - 146096) / 146097;
    const doe = z - era * 146097;
    const yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    const y   = yoe + era * 400;
    const doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    const mp  = (5 * doy + 2) / 153;
    const d   = doy - (153 * mp + 2) / 5 + 1;
    const m   = mp < 10 ? mp + 3 : mp - 9;
    const yr  = m <= 2 ? y + 1 : y;

    const pad2 = (n: i64): string => n < 10 ? "0" + n.toString() : n.toString();
    return yr.toString() + "-" + pad2(m) + "-" + pad2(d);
}

/** Obtém ou cria entidade Creator */
function loadOrCreateCreator(address: Bytes, timestamp: BigInt): Creator {
    const id = address.toHexString().toLowerCase();
    let creator = Creator.load(id);
    if (creator == null) {
        creator = new Creator(id);
        creator.totalTokens    = 0;
        creator.totalFees      = BigInt.fromI32(0);
        creator.firstCreatedAt = timestamp;
        creator.lastCreatedAt  = timestamp;
    }
    return creator;
}

/** Obtém ou cria entidade DailyStat */
function loadOrCreateDailyStat(dateStr: string): DailyStat {
    let stat = DailyStat.load(dateStr);
    if (stat == null) {
        stat = new DailyStat(dateStr);
        stat.date           = dateStr;
        stat.tokensCreated  = 0;
        stat.totalFees      = BigInt.fromI32(0);
        stat.uniqueCreators = 0;
    }
    return stat;
}

// ── Handlers ──────────────────────────────────────────────────────────────────

/**
 * Disparado a cada token criado via factory.
 * Cria: Token, atualiza DailyStat e Creator.
 * Inicia tracking do template ERC-20 para indexar Transfers.
 */
export function handleTokenCreated(event: TokenCreated): void {
    const tokenAddr   = event.params.token.toHexString().toLowerCase();
    const creatorAddr = event.params.creator;
    const timestamp   = event.block.timestamp;
    const dateStr     = timestampToDateStr(timestamp);
    const network     = dataSource.network();

    // ── Entidade Token ────────────────────────────────────────────────────────
    let token = new Token(tokenAddr);
    token.name            = event.params.name;
    token.symbol          = event.params.symbol;
    token.creator         = creatorAddr.toHexString().toLowerCase();
    token.referrer        = event.params.referrer;
    token.feePaid         = event.params.feePaid;
    token.currency        = event.params.currency;
    token.createdAt       = timestamp;
    token.transactionHash = event.transaction.hash;
    token.network         = network;
    token.save();

    // ── Entidade Creator ──────────────────────────────────────────────────────
    let creator = loadOrCreateCreator(creatorAddr, timestamp);
    creator.totalTokens  = creator.totalTokens + 1;
    creator.totalFees    = creator.totalFees.plus(event.params.feePaid);
    creator.lastCreatedAt = timestamp;
    creator.save();

    // ── Entidade DailyStat ────────────────────────────────────────────────────
    let stat = loadOrCreateDailyStat(dateStr);
    stat.tokensCreated = stat.tokensCreated + 1;
    stat.totalFees     = stat.totalFees.plus(event.params.feePaid);
    // uniqueCreators é uma estimativa simples: incrementa apenas na primeira criação do dia
    // Para precisão exata seria necessário um Set separado (não disponível em graph-ts por padrão)
    if (creator.totalTokens == 1) {
        stat.uniqueCreators = stat.uniqueCreators + 1;
    }
    stat.save();

    // ── Ativar template ERC-20 para indexar Transfers deste token ─────────────
    TokenCafeERC20.create(event.params.token);
}
