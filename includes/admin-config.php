<?php
if (!defined("TOKENCAFE_ADMIN_WALLETS")) {
  define("TOKENCAFE_ADMIN_WALLETS", [
    "0x0b81337f18767565d2ea40913799317a25dc4bc5",
  ]);
}

if (!defined("TOKENCAFE_WALLET_COOKIE")) {
  define("TOKENCAFE_WALLET_COOKIE", "tokencafe_wallet_address");
}

function tokencafe_is_admin_wallet(?string $address): bool
{
  if (!$address) return false;
  $addr = strtolower(trim($address));
  if ($addr === "") return false;
  $admins = TOKENCAFE_ADMIN_WALLETS;
  foreach ($admins as $a) {
    if (strtolower(trim((string) $a)) === $addr) return true;
  }
  return false;
}
