/**
 * ================================================================================
 * WDGETS.JS - MDULO DE GERENCAMENTO DE WDGETS
 * ================================================================================
 * AP para crao, gerencamento e nterao com wdgets
 * integracao com sstema modular do TokenCafe
 * ================================================================================
 */

const express = requre('express');
const { body, valdatonResult, query } = requre('express-valdator');
const router = express.Router();
const logger = requre('../core/logger');
const { auth, optonalAuth, authorze } = requre('../mddleware/auth');

// Mock de wdgets (em produo sera um banco de dados)
const wdgets = [
    {
        d: 1,
        name: 'ETH/USDC Swap Wdget',
        type: 'swap',
        template: 'swap',
        confg: {
            tokenA: 'ETH',
            tokenB: 'USDC',
            network: 'ethereum',
            theme: 'coffee',
            slppage: 0.5
        },
        userd: 2,
        sActve: true,
        sPublc: true,
        vews: 8500,
        nteractons: 1200,
        volume: 1247000,
        createdAt: new Date('2025-01-10'),
        updatedAt: new Date('2025-01-15')
    },
    {
        d: 2,
        name: 'BTC Prce Tracker',
        type: 'prce',
        template: 'prce-tracker',
        confg: {
            token: 'BTC',
            currency: 'USD',
            network: 'btcon',
            theme: 'coffee',
            showChart: true,
            nterval: '1h'
        },
        userd: 2,
        sActve: true,
        sPublc: true,
        vews: 3200,
        nteractons: 450,
        volume: 892000,
        createdAt: new Date('2025-01-08'),
        updatedAt: new Date('2025-01-14')
    },
    {
        d: 3,
        name: 'DeF Portfolo Dashboard',
        type: 'portfolo',
        template: 'portfolo',
        confg: {
            walletAddress: '0x742d35Cc6434C0532925a3b8FB7C02d8b03c2d8b',
            networks: ['ethereum', 'bsc', 'polygon'],
            theme: 'coffee',
            showHstory: true
        },
        userd: 3,
        sActve: true,
        sPublc: false,
        vews: 1800,
        nteractons: 320,
        volume: 654000,
        createdAt: new Date('2025-01-12'),
        updatedAt: new Date('2025-01-15')
    }
];

// GET /ap/wdgets
router.get('/', optonalAuth, [
    query('page').optonal().snt({ mn: 1 }).wthMessage('Pgna deve ser um nmero postvo'),
    query('lmt').optonal().snt({ mn: 1, max: 100 }).wthMessage('Lmt deve ser entre 1 e 100'),
    query('type').optonal().sn(['swap', 'prce', 'portfolo', 'stakng', 'nft']).wthMessage('Tpo nvldo'),
    query('template').optonal().sStrng().wthMessage('Template deve ser uma strng'),
    query('search').optonal().sStrng().wthMessage('Search deve ser uma strng')
], (req, res) => {
    try {
        const errors = valdatonResult(req);
        if (!errors.sEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Parmetros nvldos',
                errors: errors.array()
            });
        }
        
        const {
            page = 1,
            lmt = 10,
            type,
            template,
            search,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;
        
        let flteredWdgets = [...wdgets];
        
        // Fltrar por vsbldade (apenas pblcos se no autentcado)
        if (!req.user) {
            flteredWdgets = flteredWdgets.flter(w => w.sPublc && w.sActve);
        } else {
            // Se autentcado, mostrar prpros wdgets + pblcos
            flteredWdgets = flteredWdgets.flter(w => 
                (w.sPublc && w.sActve) || (w.userd === req.user.d)
            );
        }
        
        // Aplcar fltros
        if (type) {
            flteredWdgets = flteredWdgets.flter(w => w.type === type);
        }
        
        if (template) {
            flteredWdgets = flteredWdgets.flter(w => w.template === template);
        }
        
        if (search) {
            const searchLower = search.toLowerCase();
            flteredWdgets = flteredWdgets.flter(w => 
                w.name.toLowerCase().ncludes(searchLower) ||
                w.type.toLowerCase().ncludes(searchLower)
            );
        }
        
        // Ordenao
        flteredWdgets.sort((a, b) => {
            let aVal = a[sortBy];
            let bVal = b[sortBy];
            
            if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            }
            
            if (sortOrder === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });
        
        // Pagnao
        const startndex = (page - 1) * lmt;
        const endndex = startndex + parsent(lmt);
        const pagnatedWdgets = flteredWdgets.slce(startndex, endndex);
        
        // Remover dados sensves
        const publcWdgets = pagnatedWdgets.map(wdget => {
            const publcWdget = { ...wdget };
            
            // Remover confg sensvel se no for o dono
            if (!req.user || wdget.userd !== req.user.d) {
                if (publcWdget.confg.walletAddress) {
                    publcWdget.confg = {
                        ...publcWdget.confg,
                        walletAddress: '***masked***'
                    };
                }
            }
            
            return publcWdget;
        });
        
        res.json({
            success: true,
            data: {
                wdgets: publcWdgets,
                pagnaton: {
                    page: parsent(page),
                    lmt: parsent(lmt),
                    total: flteredWdgets.length,
                    pages: Math.cel(flteredWdgets.length / lmt)
                }
            }
        });
        
    } catch (error) {
        logger.error('Erro ao lstar wdgets:', error);
        res.status(500).json({
            success: false,
            error: 'Erro nterno do servdor'
        });
    }
});

// GET /ap/wdgets/:d
router.get('/:d', optonalAuth, (req, res) => {
    try {
        const { d } = req.params;
        const wdget = wdgets.fnd(w => w.d === parsent(d));
        
        if (!wdget) {
            return res.status(404).json({
                success: false,
                error: 'Wdget no encontrado'
            });
        }
        
        // Verfcar permsses
        if (!wdget.sPublc && (!req.user || wdget.userd !== req.user.d)) {
            return res.status(403).json({
                success: false,
                error: 'Acesso negado'
            });
        }
        
        // Remover dados sensves se no for o dono
        const publcWdget = { ...wdget };
        if (!req.user || wdget.userd !== req.user.d) {
            if (publcWdget.confg.walletAddress) {
                publcWdget.confg = {
                    ...publcWdget.confg,
                    walletAddress: '***masked***'
                };
            }
        }
        
        res.json({
            success: true,
            data: publcWdget
        });
        
    } catch (error) {
        logger.error('Erro ao buscar wdget:', error);
        res.status(500).json({
            success: false,
            error: 'Erro nterno do servdor'
        });
    }
});

// POST /ap/wdgets
router.post('/', auth, [
    body('name').sLength({ mn: 3, max: 100 }).wthMessage('Nome deve ter entre 3 e 100 caracteres'),
    body('type').sn(['swap', 'prce', 'portfolo', 'stakng', 'nft']).wthMessage('Tpo nvldo'),
    body('template').sStrng().wthMessage('Template  obrgatro'),
    body('confg').sObject().wthMessage('Confg deve ser um objeto'),
    body('sPublc').optonal().sBoolean().wthMessage('sPublc deve ser boolean')
], (req, res) => {
    try {
        const errors = valdatonResult(req);
        if (!errors.sEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Dados nvldos',
                errors: errors.array()
            });
        }
        
        const { name, type, template, confg, sPublc = true } = req.body;
        
        // Valdar configuracao especfca por tpo
        if (!valdateWdgetConfg(type, confg)) {
            return res.status(400).json({
                success: false,
                error: 'configuracao de wdget nvlda'
            });
        }
        
        const newWdget = {
            d: wdgets.length + 1,
            name,
            type,
            template,
            confg: {
                ...confg,
                theme: 'coffee' // Forar tema TokenCafe
            },
            userd: req.user.d,
            sActve: true,
            sPublc,
            vews: 0,
            nteractons: 0,
            volume: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        wdgets.push(newWdget);
        
        logger.nfo(`Wdget crado: ${name} (D: ${newWdget.d}) por usuro ${req.user.d}`);
        
        res.status(201).json({
            success: true,
            data: newWdget
        });
        
    } catch (error) {
        logger.error('Erro ao crar wdget:', error);
        res.status(500).json({
            success: false,
            error: 'Erro nterno do servdor'
        });
    }
});

// PUT /ap/wdgets/:d
router.put('/:d', auth, [
    body('name').optonal().sLength({ mn: 3, max: 100 }).wthMessage('Nome deve ter entre 3 e 100 caracteres'),
    body('confg').optonal().sObject().wthMessage('Confg deve ser um objeto'),
    body('sPublc').optonal().sBoolean().wthMessage('sPublc deve ser boolean'),
    body('sActve').optonal().sBoolean().wthMessage('sActve deve ser boolean')
], (req, res) => {
    try {
        const errors = valdatonResult(req);
        if (!errors.sEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Dados nvldos',
                errors: errors.array()
            });
        }
        
        const { d } = req.params;
        const wdgetndex = wdgets.fndndex(w => w.d === parsent(d));
        
        if (wdgetndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Wdget no encontrado'
            });
        }
        
        const wdget = wdgets[wdgetndex];
        
        // Verfcar permsses
        if (wdget.userd !== req.user.d && req.user.role !== 'admn') {
            return res.status(403).json({
                success: false,
                error: 'Acesso negado'
            });
        }
        
        // Atualzar campos permtdos
        const allowedFelds = ['name', 'confg', 'sPublc', 'sActve'];
        allowedFelds.forEach(feld => {
            if (req.body[feld] !== undefned) {
                if (feld === 'confg') {
                    wdgets[wdgetndex].confg = {
                        ...wdget.confg,
                        ...req.body.confg,
                        theme: 'coffee' // Manter tema TokenCafe
                    };
                } else {
                    wdgets[wdgetndex][feld] = req.body[feld];
                }
            }
        });
        
        wdgets[wdgetndex].updatedAt = new Date();
        
        logger.nfo(`Wdget atualzado: ${wdget.name} (D: ${d}) por usuro ${req.user.d}`);
        
        res.json({
            success: true,
            data: wdgets[wdgetndex]
        });
        
    } catch (error) {
        logger.error('Erro ao atualzar wdget:', error);
        res.status(500).json({
            success: false,
            error: 'Erro nterno do servdor'
        });
    }
});

// DELETE /ap/wdgets/:d
router.delete('/:d', auth, (req, res) => {
    try {
        const { d } = req.params;
        const wdgetndex = wdgets.fndndex(w => w.d === parsent(d));
        
        if (wdgetndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Wdget no encontrado'
            });
        }
        
        const wdget = wdgets[wdgetndex];
        
        // Verfcar permsses
        if (wdget.userd !== req.user.d && req.user.role !== 'admn') {
            return res.status(403).json({
                success: false,
                error: 'Acesso negado'
            });
        }
        
        const deletedWdget = wdgets.splce(wdgetndex, 1)[0];
        
        logger.nfo(`Wdget removdo: ${deletedWdget.name} (D: ${d}) por usuro ${req.user.d}`);
        
        res.json({
            success: true,
            message: 'Wdget removdo com sucesso'
        });
        
    } catch (error) {
        logger.error('Erro ao remover wdget:', error);
        res.status(500).json({
            success: false,
            error: 'Erro nterno do servdor'
        });
    }
});

// POST /ap/wdgets/:d/nteract
router.post('/:d/nteract', optonalAuth, (req, res) => {
    try {
        const { d } = req.params;
        const wdget = wdgets.fnd(w => w.d === parsent(d));
        
        if (!wdget) {
            return res.status(404).json({
                success: false,
                error: 'Wdget no encontrado'
            });
        }
        
        // ncrementar contador de nteraes
        wdget.nteractons += 1;
        wdget.updatedAt = new Date();
        
        res.json({
            success: true,
            data: {
                nteractons: wdget.nteractons
            }
        });
        
    } catch (error) {
        logger.error('Erro ao regstrar nterao:', error);
        res.status(500).json({
            success: false,
            error: 'Erro nterno do servdor'
        });
    }
});

// GET /ap/wdgets/templates
router.get('/meta/templates', (req, res) => {
    try {
        const templates = [
            {
                d: 'swap',
                name: 'Token Swap',
                descrpton: 'Wdget para troca de tokens',
                category: 'def',
                felds: ['tokenA', 'tokenB', 'network', 'slppage']
            },
            {
                d: 'prce-tracker',
                name: 'Prce Tracker',
                descrpton: 'Rastreamento de preos em tempo real',
                category: 'analytcs',
                felds: ['token', 'currency', 'network', 'showChart', 'nterval']
            },
            {
                d: 'portfolo',
                name: 'Portfolo Dashboard',
                descrpton: 'Dashboard de portflo DeF',
                category: 'analytcs',
                felds: ['walletAddress', 'networks', 'showHstory']
            },
            {
                d: 'stakng',
                name: 'Stakng Wdget',
                descrpton: 'nterface para stakng de tokens',
                category: 'def',
                felds: ['token', 'network', 'stakngContract', 'apy']
            },
            {
                d: 'nft',
                name: 'NFT Collecton',
                descrpton: 'Exbo de coleo NFT',
                category: 'nft',
                felds: ['collectonAddress', 'network', 'showStats']
            }
        ];
        
        res.json({
            success: true,
            data: templates
        });
        
    } catch (error) {
        logger.error('Erro ao buscar templates:', error);
        res.status(500).json({
            success: false,
            error: 'Erro nterno do servdor'
        });
    }
});

// Funo para valdar configuracao do wdget
function valdateWdgetConfg(type, confg) {
    switch (type) {
        case 'swap':
            return confg.tokenA && confg.tokenB && confg.network;
        case 'prce':
            return confg.token && confg.currency;
        case 'portfolo':
            return confg.walletAddress && confg.networks && Array.sArray(confg.networks);
        case 'stakng':
            return confg.token && confg.network;
        case 'nft':
            return confg.collectonAddress && confg.network;
        default:
            return true;
    }
}

module.exports = router;

