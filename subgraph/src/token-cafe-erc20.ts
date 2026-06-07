import { BigInt, dataSource } from "@graphprotocol/graph-ts";
import { Transfer as TransferEvent } from "../generated/templates/TokenCafeERC20/TokenCafeERC20";
import { Transfer } from "../generated/schema";

/**
 * Indexa cada Transfer ERC-20 dos tokens criados pela factory.
 * Chamado pelo template TokenCafeERC20 (uma instância por token deployado).
 *
 * id = txHash-logIndex garante unicidade mesmo com múltiplos transfers na mesma TX.
 */
export function handleTransfer(event: TransferEvent): void {
    const id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();

    let transfer = new Transfer(id);
    // dataSource.address() retorna o endereço do contrato ERC-20 desta instância do template
    transfer.token     = dataSource.address().toHexString().toLowerCase();
    transfer.from      = event.params.from;
    transfer.to        = event.params.to;
    transfer.value     = event.params.value;
    transfer.timestamp = event.block.timestamp;
    transfer.save();
}
