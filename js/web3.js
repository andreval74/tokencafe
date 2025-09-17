/**
 * ================================================================================
 * WEB3 ROUTES
 * ================================================================================
 * Rotas para integração Web3 e blockchain
 * ================================================================================
 */

const express = require('express');
const { query, body, validationResult } = require('express-validator');
const router = express.Router();
const logger = require('./logger');
const { optionalAuth } = require('./auth');

// Mock de dados blockchain (em produção usaria APIs reais como Moralis, Alchemy, etc.)
const mockTokens = [
    {
        symbol: 'ETH',
        name: 'Ethereum',
        address: '0x0000000000000000000000000000000000000000',
        network: 'ethereum',
        price: 2847.32,
        change24h: 5.2,
        marketCap: 342500000000,
        volume24h: 15200000000
    },
    {
        symbol: 'BTC',
        name: 'Bitcoin',
        address: 'bitcoin',
        network: 'bitcoin',
        price: 45123.45,
        change24h: -2.1,
        marketCap: 875000000000,
        volume24h: 28500000000
    },
    {
        symbol: 'USDC',
        name: 'USD Coin',
        address: '0xa0b86a33e6b6e9f4f7c3e4f5b2e0a5c9d6e1f8f3',
        network: 'ethereum',
        price: 1.00,
        change24h: 0.0,
        marketCap: 52000000000,
        volume24h: 4200000000
    },
    {
        symbol: 'BNB',
        name: 'Binance Coin',
        address: '0xb8c77482e45f1f44de1745f52c74426c631bdd52',
        network: 'bsc',
        price: 312.45,
        change24h: 3.4,
        marketCap: 48000000000,
        volume24h: 1800000000
    },
    {
        symbol: 'MATIC',
        name: 'Polygon',
        address: '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0',
        network: 'polygon',
        price: 0.85,
        change24h: 8.7,
        marketCap: 8500000000,
        volume24h: 650000000
    }
];

const mockNetworks = [
    {
        id: 'ethereum',
        name: 'Ethereum',
        chainId: 1,
        rpcUrl: 'https://eth-mainnet.alchemyapi.io/v2/demo',
        blockExplorer: 'https://etherscan.io',
        nativeCurrency: {
            symbol: 'ETH',
            name: 'Ethereum',
            decimals: 18
        },
        status: 'active',
        gasPrice: 25.5,
        blockTime: 13.2
    },
    {
        id: 'bsc',
        name: 'Binance Smart Chain',
        chainId: 56,
        rpcUrl: 'https://bsc-dataseed1.binance.org',
        blockExplorer: 'https://bscscan.com',
        nativeCurrency: {
            symbol: 'BNB',
            name: 'Binance Coin',
            decimals: 18
        },
        status: 'active',
        gasPrice: 5.2,
        blockTime: 3.1
    },
    {
        id: 'polygon',
        name: 'Polygon',
        chainId: 137,
        rpcUrl: 'https://polygon-rpc.com',
        blockExplorer: 'https://polygonscan.com',
        nativeCurrency: {
            symbol: 'MATIC',
            name: 'Polygon',
            decimals: 18
        },
        status: 'active',
        gasPrice: 1.2,
        blockTime: 2.3
    },
    {
        id: 'arbitrum',
        name: 'Arbitrum One',
        chainId: 42161,
        rpcUrl: 'https://arb1.arbitrum.io/rpc',
        blockExplorer: 'https://arbiscan.io',
        nativeCurrency: {
            symbol: 'ETH',
            name: 'Ethereum',
            decimals: 18
        },
        status: 'active',
        gasPrice: 0.8,
        blockTime: 0.25
    }
];

// GET /api/web3/tokens - Listar tokens disponíveis
router.get('/tokens', optionalAuth, [
    query('network').optional().isIn(['ethereum', 'bsc', 'polygon', 'arbitrum', 'all']).withMessage('Network inválida'),
    query('search').optional().isString().withMessage('Search deve ser string'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit entre 1 e 100')
], (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Parâmetros inválidos',
                errors: errors.array()
            });
        }
        
        const { network = 'all', search, limit = 50 } = req.query;
        
        let tokens = [...mockTokens];
        
        // Filtrar por network
        if (network !== 'all') {
            tokens = tokens.filter(token => token.network === network);
        }
        
        // Filtrar por busca
        if (search) {
            const searchLower = search.toLowerCase();
            tokens = tokens.filter(token => 
                token.symbol.toLowerCase().includes(searchLower) ||
                token.name.toLowerCase().includes(searchLower)
            );
        }
        
        // Limitar resultados
        tokens = tokens.slice(0, parseInt(limit));
        
        res.json({
            success: true,
            data: {
                tokens,
                count: tokens.length
            }
        });
        
    } catch (error) {
        logger.error('Erro ao buscar tokens:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

// GET /api/web3/tokens/:symbol - Obter informações de token específico
router.get('/tokens/:symbol', optionalAuth, [
    query('network').optional().isIn(['ethereum', 'bsc', 'polygon', 'arbitrum']).withMessage('Network inválida')
], (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Parâmetros inválidos',
                errors: errors.array()
            });
        }
        
        const { symbol } = req.params;
        const { network } = req.query;
        
        let token = mockTokens.find(t => t.symbol.toLowerCase() === symbol.toLowerCase());
        
        if (network) {
            token = mockTokens.find(t => 
                t.symbol.toLowerCase() === symbol.toLowerCase() && 
                t.network === network
            );
        }
        
        if (!token) {
            return res.status(404).json({
                success: false,
                error: 'Token não encontrado'
            });
        }
        
        // Adicionar dados históricos mock
        const historicalData = generateHistoricalData(token.price);
        
        res.json({
            success: true,
            data: {
                ...token,
                historical: historicalData,
                lastUpdated: new Date().toISOString()
            }
        });
        
    } catch (error) {
        logger.error('Erro ao buscar token:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

// GET /api/web3/networks - Listar networks suportadas
router.get('/networks', optionalAuth, (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                networks: mockNetworks,
                count: mockNetworks.length
            }
        });
        
    } catch (error) {
        logger.error('Erro ao buscar networks:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

// GET /api/web3/networks/:id - Obter informações de network específica
router.get('/networks/:id', optionalAuth, (req, res) => {
    try {
        const { id } = req.params;
        
        const network = mockNetworks.find(n => n.id === id);
        
        if (!network) {
            return res.status(404).json({
                success: false,
                error: 'Network não encontrada'
            });
        }
        
        // Adicionar estatísticas em tempo real
        const stats = {
            ...network,
            stats: {
                avgGasPrice: network.gasPrice,
                blockHeight: Math.floor(Math.random() * 1000000) + 15000000,
                tps: Math.floor(Math.random() * 50) + 10,
                tvl: Math.floor(Math.random() * 10000000000) + 5000000000,
                activeWallets: Math.floor(Math.random() * 100000) + 50000
            },
            lastUpdated: new Date().toISOString()
        };
        
        res.json({
            success: true,
            data: stats
        });
        
    } catch (error) {
        logger.error('Erro ao buscar network:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

// GET /api/web3/portfolio/:address - Obter portfolio de wallet
router.get('/portfolio/:address', optionalAuth, [
    query('networks').optional().isString().withMessage('Networks deve ser string com valores separados por vírgula')
], (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Parâmetros inválidos',
                errors: errors.array()
            });
        }
        
        const { address } = req.params;
        const { networks = 'ethereum,bsc,polygon' } = req.query;
        
        // Validar endereço Ethereum
        if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
            return res.status(400).json({
                success: false,
                error: 'Endereço de wallet inválido'
            });
        }
        
        const networkList = networks.split(',').map(n => n.trim());
        
        // Gerar portfolio mock
        const portfolio = generateMockPortfolio(address, networkList);
        
        res.json({
            success: true,
            data: portfolio
        });
        
    } catch (error) {
        logger.error('Erro ao buscar portfolio:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

// POST /api/web3/swap/quote - Obter cotação para swap
router.post('/swap/quote', optionalAuth, [
    body('tokenA').isString().withMessage('TokenA é obrigatório'),
    body('tokenB').isString().withMessage('TokenB é obrigatório'),
    body('amount').isNumeric().withMessage('Amount deve ser numérico'),
    body('network').isIn(['ethereum', 'bsc', 'polygon', 'arbitrum']).withMessage('Network inválida')
], (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Parâmetros inválidos',
                errors: errors.array()
            });
        }
        
        const { tokenA, tokenB, amount, network, slippage = 0.5 } = req.body;
        
        // Buscar tokens
        const tokenAData = mockTokens.find(t => t.symbol === tokenA);
        const tokenBData = mockTokens.find(t => t.symbol === tokenB);
        
        if (!tokenAData || !tokenBData) {
            return res.status(404).json({
                success: false,
                error: 'Token não encontrado'
            });
        }
        
        // Calcular cotação mock
        const rate = tokenAData.price / tokenBData.price;
        const outputAmount = parseFloat(amount) * rate;
        const minimumOutput = outputAmount * (1 - slippage / 100);
        const networkData = mockNetworks.find(n => n.id === network);
        
        const quote = {
            tokenA: {
                symbol: tokenA,
                amount: parseFloat(amount),
                price: tokenAData.price
            },
            tokenB: {
                symbol: tokenB,
                amount: outputAmount,
                minimumAmount: minimumOutput,
                price: tokenBData.price
            },
            rate,
            slippage: parseFloat(slippage),
            network,
            gasEstimate: {
                gasLimit: 120000,
                gasPrice: networkData.gasPrice,
                gasCost: (120000 * networkData.gasPrice) / 1e9
            },
            route: [tokenA, tokenB], // Rota simples
            priceImpact: Math.random() * 0.5, // 0-0.5%
            valid: true,
            validFor: 30, // 30 seconds
            timestamp: new Date().toISOString()
        };
        
        res.json({
            success: true,
            data: quote
        });
        
    } catch (error) {
        logger.error('Erro ao obter cotação:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

// GET /api/web3/gas/:network - Obter preços de gas
router.get('/gas/:network', optionalAuth, (req, res) => {
    try {
        const { network } = req.params;
        
        const networkData = mockNetworks.find(n => n.id === network);
        
        if (!networkData) {
            return res.status(404).json({
                success: false,
                error: 'Network não encontrada'
            });
        }
        
        const gasData = {
            network,
            prices: {
                slow: {
                    gasPrice: networkData.gasPrice * 0.8,
                    estimatedTime: '5-10 min'
                },
                standard: {
                    gasPrice: networkData.gasPrice,
                    estimatedTime: '2-3 min'
                },
                fast: {
                    gasPrice: networkData.gasPrice * 1.2,
                    estimatedTime: '30-60 sec'
                },
                instant: {
                    gasPrice: networkData.gasPrice * 1.5,
                    estimatedTime: '15-30 sec'
                }
            },
            lastUpdated: new Date().toISOString()
        };
        
        res.json({
            success: true,
            data: gasData
        });
        
    } catch (error) {
        logger.error('Erro ao buscar preços de gas:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
});

// Funções auxiliares
function generateHistoricalData(currentPrice) {
    const data = [];
    let price = currentPrice;
    
    for (let i = 23; i >= 0; i--) {
        const date = new Date();
        date.setHours(date.getHours() - i);
        
        // Simular variação de preço
        const change = (Math.random() - 0.5) * 0.1; // ±5%
        price = price * (1 + change);
        
        data.push({
            timestamp: date.toISOString(),
            price: parseFloat(price.toFixed(2)),
            volume: Math.floor(Math.random() * 1000000) + 100000
        });
    }
    
    return data;
}

function generateMockPortfolio(address, networks) {
    const holdings = [];
    const totalValueUSD = Math.floor(Math.random() * 100000) + 10000;
    
    // Gerar holdings mock para cada token
    mockTokens.forEach(token => {
        if (networks.includes(token.network)) {
            const balance = Math.random() * 100;
            const valueUSD = balance * token.price;
            
            if (balance > 0.01) { // Apenas se tiver saldo significativo
                holdings.push({
                    token: token.symbol,
                    name: token.name,
                    network: token.network,
                    address: token.address,
                    balance: parseFloat(balance.toFixed(4)),
                    price: token.price,
                    valueUSD: parseFloat(valueUSD.toFixed(2)),
                    change24h: token.change24h
                });
            }
        }
    });
    
    // Calcular totais
    const actualTotal = holdings.reduce((sum, h) => sum + h.valueUSD, 0);
    
    return {
        address,
        networks,
        totalValueUSD: parseFloat(actualTotal.toFixed(2)),
        holdings,
        distributionByNetwork: networks.reduce((dist, network) => {
            const networkValue = holdings
                .filter(h => h.network === network)
                .reduce((sum, h) => sum + h.valueUSD, 0);
            dist[network] = parseFloat((networkValue / actualTotal * 100).toFixed(1));
            return dist;
        }, {}),
        lastUpdated: new Date().toISOString()
    };
}

module.exports = router;
