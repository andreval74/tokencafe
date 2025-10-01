"""
🐍 TokenCafe - Servidor Flask
Backend Python alternativo ao Node.js para o sistema TokenCafe
"""

from flask import Flask, jsonify, request, send_from_directory, render_template_string
from flask_cors import CORS
import os
import json
from datetime import datetime, timedelta
import jwt
from functools import wraps

# Configuração da aplicação
app = Flask(__name__)
CORS(app)  # Permitir requisições cross-origin
app.config['SECRET_KEY'] = 'tokencafe-secret-2024'

# Configuração do diretório de templates
TEMPLATE_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), '')
app.template_folder = TEMPLATE_FOLDER

# ============================================================================
# DADOS SIMULADOS (Mock Data)
# ============================================================================

# Dados de usuários
users_db = [
    {
        "id": 1,
        "username": "admin",
        "email": "admin@tokencafe.com",
        "password": "admin123",  # Em produção, usar hash
        "role": "admin",
        "created_at": "2024-01-15T10:00:00Z"
    },
    {
        "id": 2,
        "username": "user1",
        "email": "user1@tokencafe.com", 
        "password": "user123",
        "role": "user",
        "created_at": "2024-01-16T14:30:00Z"
    }
]

# Dados de widgets
widgets_db = [
    {
        "id": 1,
        "name": "Bitcoin Price Tracker",
        "type": "price",
        "symbol": "BTC",
        "description": "Widget para rastrear preço do Bitcoin em tempo real",
        "config": {
            "theme": "dark",
            "currency": "USD",
            "refresh_interval": 30
        },
        "created_at": "2024-01-15T10:30:00Z",
        "user_id": 1,
        "active": True
    },
    {
        "id": 2,
        "name": "Ethereum Portfolio",
        "type": "portfolio", 
        "symbol": "ETH",
        "description": "Acompanhamento de portfolio Ethereum",
        "config": {
            "theme": "light",
            "show_chart": True,
            "timeframe": "24h"
        },
        "created_at": "2024-01-16T09:15:00Z",
        "user_id": 2,
        "active": True
    }
]

# Dados de templates
templates_db = [
    {
        "id": 1,
        "name": "Price Display",
        "category": "trading",
        "description": "Template básico para exibir preços",
        "html": "<div class='price-widget'>{{price}}</div>",
        "css": ".price-widget { font-size: 2rem; }",
        "js": "console.log('Price widget loaded');",
        "created_at": "2024-01-15T11:00:00Z"
    }
]

# Dados de analytics
analytics_db = {
    "total_users": len(users_db),
    "total_widgets": len(widgets_db),
    "active_widgets": len([w for w in widgets_db if w["active"]]),
    "daily_visits": 1247,
    "monthly_revenue": 15420.50
}

# ============================================================================
# MIDDLEWARES E UTILITÁRIOS
# ============================================================================

def token_required(f):
    """Decorator para rotas que requerem autenticação"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        try:
            if token.startswith('Bearer '):
                token = token[7:]
            
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = next((user for user in users_db if user['id'] == data['user_id']), None)
            
            if not current_user:
                return jsonify({'error': 'User not found'}), 401
                
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Token is invalid'}), 401
        
        return f(current_user, *args, **kwargs)
    return decorated

def admin_required(f):
    """Decorator para rotas que requerem privilégios de admin"""
    @wraps(f)
    def decorated(current_user, *args, **kwargs):
        if current_user['role'] != 'admin':
            return jsonify({'error': 'Admin privileges required'}), 403
        return f(current_user, *args, **kwargs)
    return decorated

# ============================================================================
# ROTAS DE ARQUIVOS ESTÁTICOS
# ============================================================================

@app.route('/')
def serve_index():
    """Servir página principal"""
    return send_from_directory('pages', 'index.html')

@app.route('/dashboard')
def serve_dashboard():
    """Servir dashboard principal"""
    return send_from_directory('pages', 'dash-main.html')

@app.route('/test-system')
def serve_test_system():
    """Servir sistema de testes"""
    return send_from_directory('.', 'test-system.html')

@app.route('/pages/<path:filename>')
def serve_pages(filename):
    """Servir arquivos da pasta pages"""
    return send_from_directory('pages', filename)

@app.route('/dashboard/<path:filename>')
def serve_dashboard_files(filename):
    """Servir arquivos do dashboard"""
    return send_from_directory('dashboard', filename)

@app.route('/shared/<path:filename>')
def serve_shared(filename):
    """Servir recursos compartilhados"""
    return send_from_directory('shared', filename)

# ============================================================================
# API - AUTENTICAÇÃO
# ============================================================================

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Endpoint de login"""
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        # Buscar usuário
        user = next((u for u in users_db if u['email'] == email and u['password'] == password), None)
        
        if not user:
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Gerar token JWT
        token = jwt.encode({
            'user_id': user['id'],
            'exp': datetime.utcnow() + timedelta(hours=24)
        }, app.config['SECRET_KEY'], algorithm='HS256')
        
        return jsonify({
            'success': True,
            'token': token,
            'user': {
                'id': user['id'],
                'username': user['username'],
                'email': user['email'],
                'role': user['role']
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/register', methods=['POST'])
def register():
    """Endpoint de registro"""
    try:
        data = request.get_json()
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        
        if not all([username, email, password]):
            return jsonify({'error': 'All fields are required'}), 400
        
        # Verificar se usuário já existe
        if any(u['email'] == email for u in users_db):
            return jsonify({'error': 'Email already exists'}), 409
        
        # Criar novo usuário
        new_user = {
            'id': len(users_db) + 1,
            'username': username,
            'email': email,
            'password': password,  # Em produção, usar hash
            'role': 'user',
            'created_at': datetime.utcnow().isoformat() + 'Z'
        }
        
        users_db.append(new_user)
        
        return jsonify({
            'success': True,
            'message': 'User created successfully',
            'user': {
                'id': new_user['id'],
                'username': new_user['username'],
                'email': new_user['email'],
                'role': new_user['role']
            }
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/me', methods=['GET'])
@token_required
def get_current_user(current_user):
    """Obter dados do usuário atual"""
    return jsonify({
        'user': {
            'id': current_user['id'],
            'username': current_user['username'],
            'email': current_user['email'],
            'role': current_user['role']
        }
    }), 200

# ============================================================================
# API - WIDGETS
# ============================================================================

@app.route('/api/widgets', methods=['GET'])
@token_required
def get_widgets(current_user):
    """Listar widgets do usuário"""
    try:
        # Filtrar widgets do usuário (admin vê todos)
        if current_user['role'] == 'admin':
            user_widgets = widgets_db
        else:
            user_widgets = [w for w in widgets_db if w['user_id'] == current_user['id']]
        
        return jsonify({
            'widgets': user_widgets,
            'total': len(user_widgets)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/widgets', methods=['POST'])
@token_required
def create_widget(current_user):
    """Criar novo widget"""
    try:
        data = request.get_json()
        
        # Validação básica
        required_fields = ['name', 'type', 'symbol']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Criar novo widget
        new_widget = {
            'id': len(widgets_db) + 1,
            'name': data['name'],
            'type': data['type'],
            'symbol': data['symbol'],
            'description': data.get('description', ''),
            'config': data.get('config', {}),
            'created_at': datetime.utcnow().isoformat() + 'Z',
            'user_id': current_user['id'],
            'active': True
        }
        
        widgets_db.append(new_widget)
        
        return jsonify({
            'success': True,
            'widget': new_widget
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/widgets/<int:widget_id>', methods=['GET'])
@token_required
def get_widget(current_user, widget_id):
    """Obter widget específico"""
    widget = next((w for w in widgets_db if w['id'] == widget_id), None)
    
    if not widget:
        return jsonify({'error': 'Widget not found'}), 404
    
    # Verificar permissão
    if current_user['role'] != 'admin' and widget['user_id'] != current_user['id']:
        return jsonify({'error': 'Access denied'}), 403
    
    return jsonify({'widget': widget}), 200

@app.route('/api/widgets/<int:widget_id>', methods=['PUT'])
@token_required
def update_widget(current_user, widget_id):
    """Atualizar widget"""
    widget = next((w for w in widgets_db if w['id'] == widget_id), None)
    
    if not widget:
        return jsonify({'error': 'Widget not found'}), 404
    
    # Verificar permissão
    if current_user['role'] != 'admin' and widget['user_id'] != current_user['id']:
        return jsonify({'error': 'Access denied'}), 403
    
    # Atualizar dados
    data = request.get_json()
    widget.update({
        'name': data.get('name', widget['name']),
        'type': data.get('type', widget['type']),
        'symbol': data.get('symbol', widget['symbol']),
        'description': data.get('description', widget['description']),
        'config': data.get('config', widget['config']),
        'active': data.get('active', widget['active'])
    })
    
    return jsonify({
        'success': True,
        'widget': widget
    }), 200

@app.route('/api/widgets/<int:widget_id>', methods=['DELETE'])
@token_required
def delete_widget(current_user, widget_id):
    """Deletar widget"""
    global widgets_db
    
    widget = next((w for w in widgets_db if w['id'] == widget_id), None)
    
    if not widget:
        return jsonify({'error': 'Widget not found'}), 404
    
    # Verificar permissão
    if current_user['role'] != 'admin' and widget['user_id'] != current_user['id']:
        return jsonify({'error': 'Access denied'}), 403
    
    # Remover widget
    widgets_db = [w for w in widgets_db if w['id'] != widget_id]
    
    return jsonify({'success': True, 'message': 'Widget deleted'}), 200

# ============================================================================
# API - USUÁRIOS (Admin)
# ============================================================================

@app.route('/api/users', methods=['GET'])
@token_required
@admin_required
def get_users(current_user):
    """Listar usuários (admin only)"""
    return jsonify({
        'users': [{'id': u['id'], 'username': u['username'], 'email': u['email'], 'role': u['role'], 'created_at': u['created_at']} for u in users_db]
    }), 200

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
@token_required
@admin_required
def delete_user(current_user, user_id):
    """Deletar usuário (admin only)"""
    global users_db
    
    if user_id == current_user['id']:
        return jsonify({'error': 'Cannot delete yourself'}), 400
    
    users_db = [u for u in users_db if u['id'] != user_id]
    return jsonify({'success': True, 'message': 'User deleted'}), 200

# ============================================================================
# API - ANALYTICS
# ============================================================================

@app.route('/api/analytics/overview', methods=['GET'])
@token_required
def get_analytics_overview(current_user):
    """Obter visão geral de analytics"""
    return jsonify({
        'overview': analytics_db
    }), 200

@app.route('/api/analytics/widgets', methods=['GET'])
@token_required
def get_widgets_analytics(current_user):
    """Analytics de widgets"""
    widget_types = {}
    for widget in widgets_db:
        widget_type = widget['type']
        widget_types[widget_type] = widget_types.get(widget_type, 0) + 1
    
    return jsonify({
        'widget_types': widget_types,
        'total_widgets': len(widgets_db),
        'active_widgets': len([w for w in widgets_db if w['active']])
    }), 200

# ============================================================================
# API - TEMPLATES
# ============================================================================

@app.route('/api/templates', methods=['GET'])
def get_templates():
    """Listar templates disponíveis"""
    return jsonify({
        'templates': templates_db
    }), 200

@app.route('/api/templates/<int:template_id>', methods=['GET'])
def get_template(template_id):
    """Obter template específico"""
    template = next((t for t in templates_db if t['id'] == template_id), None)
    
    if not template:
        return jsonify({'error': 'Template not found'}), 404
    
    return jsonify({'template': template}), 200

# ============================================================================
# API - WEB3 (Mock)
# ============================================================================

@app.route('/api/web3/price/<symbol>', methods=['GET'])
def get_crypto_price(symbol):
    """Obter preço de criptomoeda (mock)"""
    # Preços simulados
    mock_prices = {
        'BTC': {'price': 45230.50, 'change_24h': 2.34},
        'ETH': {'price': 3180.75, 'change_24h': -1.23},
        'BNB': {'price': 320.45, 'change_24h': 0.87},
        'ADA': {'price': 1.25, 'change_24h': 3.45},
        'SOL': {'price': 98.30, 'change_24h': -2.10}
    }
    
    symbol = symbol.upper()
    if symbol not in mock_prices:
        return jsonify({'error': 'Symbol not found'}), 404
    
    return jsonify({
        'symbol': symbol,
        'price': mock_prices[symbol]['price'],
        'change_24h': mock_prices[symbol]['change_24h'],
        'timestamp': datetime.utcnow().isoformat()
    }), 200

@app.route('/api/web3/networks', methods=['GET'])
def get_supported_networks():
    """Listar redes suportadas"""
    networks = [
        {'id': 1, 'name': 'Ethereum', 'symbol': 'ETH', 'rpc': 'https://mainnet.infura.io'},
        {'id': 56, 'name': 'BSC', 'symbol': 'BNB', 'rpc': 'https://bsc-dataseed.binance.org'},
        {'id': 137, 'name': 'Polygon', 'symbol': 'MATIC', 'rpc': 'https://polygon-rpc.com'},
        {'id': 42161, 'name': 'Arbitrum', 'symbol': 'ETH', 'rpc': 'https://arb1.arbitrum.io/rpc'}
    ]
    
    return jsonify({'networks': networks}), 200

# ============================================================================
# SERVIDOR PRINCIPAL
# ============================================================================

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'TokenCafe Flask Server',
        'version': '1.0.0',
        'timestamp': datetime.utcnow().isoformat()
    }), 200

if __name__ == '__main__':
    print("🐍 ===== TOKENCAFE FLASK SERVER =====")
    print("🚀 Iniciando servidor Flask...")
    print("📡 Porta: 3001")
    print("🌐 URLs disponíveis:")
    print("   • http://localhost:3001 (Página principal)")
    print("   • http://localhost:3001/dashboard (Dashboard)")
    print("   • http://localhost:3001/test-system (Testes)")
    print("   • http://localhost:3001/api/auth/login (API Login)")
    print("   • http://localhost:3001/api/widgets (API Widgets)")
    print("   • http://localhost:3001/health (Health Check)")
    print("☕ TokenCafe Flask - Pronto para servir!")
    print("=" * 50)
    
    # Executar servidor
    app.run(
        host='0.0.0.0',
        port=3001,
        debug=True,
        use_reloader=False  # Evitar restart duplo no modo debug
    )
