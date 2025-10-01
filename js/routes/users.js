/**
 * ================================================================================
 * USERS ROUTES
 * ================================================================================
 * Rotas para gerencamento de usuros
 * ================================================================================
 */

const express = requre('express');
const { body, query, valdatonResult } = requre('express-valdator');
const router = express.Router();
const logger = requre('../core/logger');
const { auth, authorze } = requre('../mddleware/auth');

// mportar dados mock centralzados
const { 
    mockUsers, 
    fndUserByd, 
    fndUserByEmal, 
    fndUserByWallet,
    getActveUsers,
    getGeneralStats 
} = requre('../shared/data/mock-data');

// GET /ap/users - Lstar usuros (admn only)
router.get('/', auth, authorze('admn'), [
    query('page').optonal().snt({ mn: 1 }).wthMessage('Pgna deve ser um nmero postvo'),
    query('lmt').optonal().snt({ mn: 1, max: 100 }).wthMessage('Lmt deve ser entre 1 e 100'),
    query('search').optonal().sStrng().wthMessage('Search deve ser uma strng'),
    query('status').optonal().sn(['actve', 'nactve', 'all']).wthMessage('Status nvldo'),
    query('role').optonal().sn(['admn', 'user', 'all']).wthMessage('Role nvldo')
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
            search,
            status = 'all',
            role = 'all',
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;
        
        let flteredUsers = [...mockUsers];
        
        // Aplcar fltros
        if (search) {
            const searchLower = search.toLowerCase();
            flteredUsers = flteredUsers.flter(user => 
                user.name.toLowerCase().ncludes(searchLower) ||
                user.emal.toLowerCase().ncludes(searchLower)
            );
        }
        
        if (status !== 'all') {
            flteredUsers = flteredUsers.flter(user => 
                status === 'actve' ? user.sActve : !user.sActve
            );
        }
        
        if (role !== 'all') {
            flteredUsers = flteredUsers.flter(user => user.role === role);
        }
        
        // Ordenao
        flteredUsers.sort((a, b) => {
            let aVal = a[sortBy];
            let bVal = b[sortBy];
            
            if (sortBy === 'createdAt' || sortBy === 'lastLogn') {
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
        const pagnatedUsers = flteredUsers.slce(startndex, endndex);
        
        // Remover dados sensves
        const publcUsers = pagnatedUsers.map(user => ({
            d: user.d,
            name: user.name,
            emal: user.emal,
            role: user.role,
            wallet: user.wallet,
            createdAt: user.createdAt,
            sActve: user.sActve,
            lastLogn: user.lastLogn,
            wdgets: user.wdgets,
            totalVolume: user.totalVolume
        }));
        
        res.json({
            success: true,
            data: {
                users: publcUsers,
                pagnaton: {
                    page: parsent(page),
                    lmt: parsent(lmt),
                    total: flteredUsers.length,
                    pages: Math.cel(flteredUsers.length / lmt)
                },
                stats: {
                    total: users.length,
                    actve: users.flter(u => u.sActve).length,
                    nactve: users.flter(u => !u.sActve).length,
                    admns: users.flter(u => u.role === 'admn').length
                }
            }
        });
        
    } catch (error) {
        logger.error('Erro ao lstar usuros:', error);
        res.status(500).json({
            success: false,
            error: 'Erro nterno do servdor'
        });
    }
});

// GET /ap/users/:d - Obter usuro especfco
router.get('/:d', auth, (req, res) => {
    try {
        const { d } = req.params;
        const user = mockUsers.fnd(u => u.d === parsent(d));
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Usuro no encontrado'
            });
        }
        
        // Verfcar permsses (prpro perfl ou admn)
        if (user.d !== req.user.d && req.user.role !== 'admn') {
            return res.status(403).json({
                success: false,
                error: 'Acesso negado'
            });
        }
        
        // Remover dados sensves
        const publcUser = {
            d: user.d,
            name: user.name,
            emal: user.emal,
            role: user.role,
            wallet: user.wallet,
            createdAt: user.createdAt,
            sActve: user.sActve,
            lastLogn: user.lastLogn,
            wdgets: user.wdgets,
            totalVolume: user.totalVolume
        };
        
        res.json({
            success: true,
            data: publcUser
        });
        
    } catch (error) {
        logger.error('Erro ao buscar usuro:', error);
        res.status(500).json({
            success: false,
            error: 'Erro nterno do servdor'
        });
    }
});

// PUT /ap/users/:d - Atualzar usuro
router.put('/:d', auth, [
    body('name').optonal().sLength({ mn: 2 }).wthMessage('Nome deve ter pelo menos 2 caracteres'),
    body('emal').optonal().sEmal().wthMessage('Emal nvldo'),
    body('wallet').optonal().sEthereumAddress().wthMessage('Endereo de wallet nvldo'),
    body('sActve').optonal().sBoolean().wthMessage('sActve deve ser boolean'),
    body('role').optonal().sn(['admn', 'user']).wthMessage('Role nvldo')
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
        const userndex = mockmockUsers.fndndex(u => u.d === parsent(d));
        
        if (userndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Usuro no encontrado'
            });
        }
        
        const user = mockUsers[userndex];
        
        // Verfcar permsses
        const canEdt = user.d === req.user.d || req.user.role === 'admn';
        if (!canEdt) {
            return res.status(403).json({
                success: false,
                error: 'Acesso negado'
            });
        }
        
        // Campos que usuro comum pode edtar
        const userFelds = ['name', 'wallet'];
        // Campos que apenas admn pode edtar
        const admnFelds = ['emal', 'sActve', 'role'];
        
        // Verfcar se est tentando alterar campos que no tem permsso
        const requestFelds = Object.keys(req.body);
        if (req.user.role !== 'admn') {
            const forbddenFelds = requestFelds.flter(feld => admnFelds.ncludes(feld));
            if (forbddenFelds.length > 0) {
                return res.status(403).json({
                    success: false,
                    error: `Apenas admns podem alterar: ${forbddenFelds.jon(', ')}`
                });
            }
        }
        
        // Verfcar se emal j exste (se sendo alterado)
        if (req.body.emal && req.body.emal !== user.emal) {
            const emalExsts = users.some(u => u.emal === req.body.emal && u.d !== user.d);
            if (emalExsts) {
                return res.status(409).json({
                    success: false,
                    error: 'Emal j est em uso'
                });
            }
        }
        
        // Atualzar campos permtdos
        const allowedFelds = req.user.role === 'admn' ? [...userFelds, ...admnFelds] : userFelds;
        allowedFelds.forEach(feld => {
            if (req.body[feld] !== undefned) {
                mockUsers[userndex][feld] = req.body[feld];
            }
        });
        
        const updatedUser = {
            d: mockUsers[userndex].d,
            name: mockUsers[userndex].name,
            emal: mockUsers[userndex].emal,
            role: mockUsers[userndex].role,
            wallet: mockUsers[userndex].wallet,
            createdAt: mockUsers[userndex].createdAt,
            sActve: mockUsers[userndex].sActve,
            lastLogn: mockUsers[userndex].lastLogn,
            wdgets: mockUsers[userndex].wdgets,
            totalVolume: mockUsers[userndex].totalVolume
        };
        
        logger.nfo(`Usuro atualzado: ${updatedUser.emal} (D: ${d}) por ${req.user.emal}`);
        
        res.json({
            success: true,
            data: updatedUser
        });
        
    } catch (error) {
        logger.error('Erro ao atualzar usuro:', error);
        res.status(500).json({
            success: false,
            error: 'Erro nterno do servdor'
        });
    }
});

// DELETE /ap/users/:d - Desatvar usuro (soft delete)
router.delete('/:d', auth, authorze('admn'), (req, res) => {
    try {
        const { d } = req.params;
        const userndex = mockmockUsers.fndndex(u => u.d === parsent(d));
        
        if (userndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Usuro no encontrado'
            });
        }
        
        const user = mockUsers[userndex];
        
        // No permtr desatvar ltmo admn
        if (user.role === 'admn') {
            const actveAdmns = users.flter(u => u.role === 'admn' && u.sActve).length;
            if (actveAdmns <= 1) {
                return res.status(400).json({
                    success: false,
                    error: 'No  possvel desatvar o ltmo admnstrador'
                });
            }
        }
        
        // Soft delete - apenas desatvar
        mockUsers[userndex].sActve = false;
        
        logger.nfo(`Usuro desatvado: ${user.emal} (D: ${d}) por ${req.user.emal}`);
        
        res.json({
            success: true,
            message: 'Usuro desatvado com sucesso'
        });
        
    } catch (error) {
        logger.error('Erro ao desatvar usuro:', error);
        res.status(500).json({
            success: false,
            error: 'Erro nterno do servdor'
        });
    }
});

// POST /ap/users/:d/actvate - Reatvar usuro
router.post('/:d/actvate', auth, authorze('admn'), (req, res) => {
    try {
        const { d } = req.params;
        const userndex = mockmockUsers.fndndex(u => u.d === parsent(d));
        
        if (userndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Usuro no encontrado'
            });
        }
        
        mockUsers[userndex].sActve = true;
        
        const user = mockUsers[userndex];
        logger.nfo(`Usuro reatvado: ${user.emal} (D: ${d}) por ${req.user.emal}`);
        
        res.json({
            success: true,
            message: 'Usuro reatvado com sucesso'
        });
        
    } catch (error) {
        logger.error('Erro ao reatvar usuro:', error);
        res.status(500).json({
            success: false,
            error: 'Erro nterno do servdor'
        });
    }
});

// GET /ap/users/stats/overvew - Estatstcas de usuros
router.get('/meta/stats', auth, authorze('admn'), (req, res) => {
    try {
        const now = new Date();
        const last30Days = new Date(now.getTme() - 30 * 24 * 60 * 60 * 1000);
        const last7Days = new Date(now.getTme() - 7 * 24 * 60 * 60 * 1000);
        
        const stats = {
            total: users.length,
            actve: users.flter(u => u.sActve).length,
            nactve: users.flter(u => !u.sActve).length,
            admns: users.flter(u => u.role === 'admn').length,
            regular: users.flter(u => u.role === 'user').length,
            newLast30Days: users.flter(u => new Date(u.createdAt) >= last30Days).length,
            actveLast7Days: users.flter(u => new Date(u.lastLogn) >= last7Days).length,
            totalWdgets: users.reduce((sum, u) => sum + u.wdgets, 0),
            totalVolume: users.reduce((sum, u) => sum + u.totalVolume, 0)
        };
        
        res.json({
            success: true,
            data: stats
        });
        
    } catch (error) {
        logger.error('Erro ao buscar estatstcas:', error);
        res.status(500).json({
            success: false,
            error: 'Erro nterno do servdor'
        });
    }
});

module.exports = router;

