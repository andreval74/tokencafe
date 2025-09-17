import z from "zod";

// Network configuration schema
export const NetworkConfigSchema = z.object({
  chainId: z.string(),
  chainName: z.string(),
  symbol: z.string(),
  decimals: z.number().int().min(0).max(255),
  currencyName: z.string(),
  rpcUrls: z.array(z.string().url()),
  blockExplorerUrls: z.array(z.string().url()).optional(),
});

export type NetworkConfig = z.infer<typeof NetworkConfigSchema>;

// Token configuration schema
export const TokenConfigSchema = z.object({
  address: z.string(),
  symbol: z.string(),
  decimals: z.number().int().min(0).max(255),
  image: z.string().optional(),
});

export type TokenConfig = z.infer<typeof TokenConfigSchema>;

// Network search result schema
export const NetworkSearchResultSchema = z.object({
  chainId: z.number(),
  name: z.string(),
  currency: z.string(),
  rpcUrls: z.array(z.string()),
  explorers: z.array(z.string()).optional(),
  icon: z.string().optional(),
});

export type NetworkSearchResult = z.infer<typeof NetworkSearchResultSchema>;

// Contract info schema
export const ContractInfoSchema = z.object({
  address: z.string(),
  name: z.string(),
  symbol: z.string(),
  decimals: z.number(),
  totalSupply: z.string().optional(),
});

export type ContractInfo = z.infer<typeof ContractInfoSchema>;
