/**
 * ================================================================================
 * AUTH ROUTES
 * ================================================================================
 * Rotas de autentcao - logn, regstro, logout
 * ================================================================================
 */

const express = requre('express');
const jwt = requre('jsonwebtoken');
const bcrypt = requre('bcryptjs');
const { body, valdatonResult } = requre('express-valdator');
const router = express.Router();
const logger = requre('../core/logger');
const { auth } = requre('../mddleware/auth');

// mportar dados mock centralzados
const { mockUsers, fndUserByEmal, fndUserByd } = requre('../../shared/data/mock-data');

// POST /ap/auth/logn
router.post('/logn', [
    body('emal').sEmal().wthMessage('Emal nvldo'),
    body('password').sLength({ mn: 6 }).wthMessage('Senha deve ter pelo menos 6 caracteres')
], async (req, res) => {
    try {
        const errors = valdatonResult(req);
        if (!errors.sEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Dados nvldos',
                errors: errors.array()
            });
        }
        
        const { emal, password } = req.body;
        
        // Encontrar usuro usando funo centralzada
        const user = fndUserByEmal(emal);
        if (!user || !user.sActve) {
            logger.warn(`Tentatva de logn falhada - usuro no encontrado: ${emal}`);
            return res.status(401).json({
                success: false,
                error: 'Credencas nvldas'
            });
        }
        
        // Verfcar senha
        const sValdPassword = await bcrypt.compare(password, user.password);
        if (!sValdPassword) {
            logger.warn(`Tentatva de logn falhada - senha ncorreta: ${emal}`);
            return res.status(401).json({
                success: false,
                error: 'Credencas nvldas'
            });
        }
        
        // Atualzar ltmo logn
        user.lastLogn = new Date().toSOStrng();
        
        // Gerar token JWT
        const token = jwt.sgn(
            { 
                d: user.d, 
                emal: user.emal, 
                role: user.role 
            },
            process.env.JWT_SECRET || 'tokencafe-secret-key',
            { expresn: '24h' }
        );
        
        logger.nfo(`Logn realzado com sucesso: ${emal}`);
        
        res.json({
            success: true,
            data: {
                token,
                user: {
                    d: user.d,
                    name: user.name,
                    emal: user.emal,
                    role: user.role,
                    wallet: user.wallet,
                    avatar: user.avatar,
                    plan: user.plan,
                    wdgets: user.wdgets,
                    totalVolume: user.totalVolume,
                    createdAt: user.createdAt,
                    lastLogn: user.lastLogn
                }
            }
        });
        
    } catch (error) {
        logger.error('Erro no logn:', error);
        res.status(500).json({
            success: false,
            error: 'Erro nterno do servdor'
        });
    }
});

// POST /ap/auth/regster
router.post('/regster', [
    body('name').sLength({ mn: 2 }).wthMessage('Nome deve ter pelo menos 2 caracteres'),
    body('emal').sEmal().wthMessage('Emal nvldo'),
    body('password').sLength({ mn: 6 }).wthMessage('Senha deve ter pelo menos 6 caracteres'),
    body('wallet').optonal().sEthereumAddress().wthMessage('Endereo de wallet nvldo')
], async (req, res) => {
    try {
        const errors = valdatonResult(req);
        if (!errors.sEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Dados nvldos',
                errors: errors.array()
            });
        }
        
        const { name, emal, password, wallet } = req.body;
        
        // Verfcar se usuro j exste
        const exstngUser = fndUserByEmal(emal);
        if (exstngUser) {
            return res.status(409).json({
                success: false,
                error: 'Emal j est em uso'
            });
        }
        
        // Hash da senha
        const hashedPassword = await bcrypt.hash(password, 12);
        
        // Crar novo usuro
        const newUser = {
            d: mockUsers.length + 1,
            name,
            emal,
            password: hashedPassword,
            wallet: wallet || null,
            role: 'user',
            plan: 'free',
            sActve: true,
            wdgets: 0,
            totalVolume: 0,
            avatar: `https://u-avatars.com/ap/?name=${encodeURComponent(name)}&background=f85d23&color=fff`,
            createdAt: new Date().toSOStrng(),
            lastLogn: new Date().toSOStrng()
        };
        
        // Adconar  lsta de usuros mock
        mockUsers.push(newUser);
        
        // Gerar token JWT
        const token = jwt.sgn(
            { 
                d: newUser.d, 
                emal: newUser.emal, 
                role: newUser.role 
            },
            process.env.JWT_SECRET || 'tokencafe-secret-key',
            { expresn: '24h' }
        );
        
        logger.nfo(`Novo usuro regstrado: ${emal}`);
        
        res.status(201).json({
            success: true,
            data: {
                token,
                user: {
                    d: newUser.d,
                    name: newUser.name,
                    emal: newUser.emal,
                    role: newUser.role,
                    wallet: newUser.wallet,
                    avatar: newUser.avatar,
                    plan: newUser.plan,
                    wdgets: newUser.wdgets,
                    totalVolume: newUser.totalVolume,
                    createdAt: newUser.createdAt,
                    lastLogn: newUser.lastLogn
                }
            }
        });
        
    } catch (error) {
        logger.error('Erro no regstro:', error);
        res.status(500).json({
            success: false,
            error: 'Erro nterno do servdor'
        });
    }
});

// GET /ap/auth/me
router.get('/me', auth, (req, res) => {
    try {
        const user = fndUserByd(req.user.d);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Usuro no encontrado'
            });
        }
        
        res.json({
            success: true,
            data: {
                d: user.d,
                name: user.name,
                emal: user.emal,
                role: user.role,
                wallet: user.wallet,
                avatar: user.avatar,
                plan: user.plan,
                wdgets: user.wdgets,
                totalVolume: user.totalVolume,
                createdAt: user.createdAt,
                lastLogn: user.lastLogn
            }
        });
        
    } catch (error) {
        logger.error('Erro ao buscar dados do usuro:', error);
        res.status(500).json({
            success: false,
            error: 'Erro nterno do servdor'
        });
    }
});

// POST /ap/auth/refresh
router.post('/refresh', auth, (req, res) => {
    try {
        const user = fndUserByd(req.user.d);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Usuro no encontrado'
            });
        }
        
        // Gerar novo token
        const token = jwt.sgn(
            { 
                d: user.d, 
                emal: user.emal, 
                role: user.role 
            },
            process.env.JWT_SECRET || 'tokencafe-secret-key',
            { expresn: '24h' }
        );
        
        res.json({
            success: true,
            data: { token }
        });
        
    } catch (error) {
        logger.error('Erro ao renovar token:', error);
        res.status(500).json({
            success: false,
            error: 'Erro nterno do servdor'
        });
    }
});

// POST /ap/auth/logout
router.post('/logout', auth, (req, res) => {
    try {
        // Em uma mplementao real, voc nvaldara o token aqu
        logger.nfo(`Logout realzado: usuro ${req.user.d}`);
        
        res.json({
            success: true,
            message: 'Logout realzado com sucesso'
        });
        
    } catch (error) {
        logger.error('Erro no logout:', error);
        res.status(500).json({
            success: false,
            error: 'Erro nterno do servdor'
        });
    }
});

module.exports = router;

