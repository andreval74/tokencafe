# 🔌 Extensão WebSocket para TokenCafe Flask
# Adicione estas linhas ao server_flask.py para ter WebSocket

from flask_socketio import SocketIO, emit
import threading
import time
import random

# Adicionar ao server_flask.py:
socketio = SocketIO(app, cors_allowed_origins="*")

# Preços simulados para demonstração
crypto_prices = {
    'BTC': 45000,
    'ETH': 3200,
    'BNB': 320,
    'ADA': 1.25
}

@socketio.on('connect')
def handle_connect():
    """Cliente conectou ao WebSocket"""
    print(f'👤 Cliente conectado: {request.sid}')
    emit('message', {'data': 'Conectado ao TokenCafe Real-time!'})

@socketio.on('disconnect')
def handle_disconnect():
    """Cliente desconectou"""
    print(f'👋 Cliente desconectado: {request.sid}')

@socketio.on('subscribe_prices')
def handle_subscribe_prices(data):
    """Cliente quer receber preços em tempo real"""
    symbols = data.get('symbols', ['BTC', 'ETH'])
    print(f'📊 Cliente inscrito para preços: {symbols}')
    
    # Enviar preços atuais
    for symbol in symbols:
        if symbol in crypto_prices:
            emit('price_update', {
                'symbol': symbol,
                'price': crypto_prices[symbol],
                'timestamp': time.time()
            })

def price_updater():
    """Thread para simular atualizações de preço"""
    while True:
        for symbol in crypto_prices:
            # Simular flutuação de preço (±2%)
            change = random.uniform(-0.02, 0.02)
            crypto_prices[symbol] *= (1 + change)
            
            # Enviar para todos os clientes conectados
            socketio.emit('price_update', {
                'symbol': symbol,
                'price': round(crypto_prices[symbol], 2),
                'change': round(change * 100, 2),
                'timestamp': time.time()
            })
        
        time.sleep(2)  # Atualizar a cada 2 segundos

# Iniciar thread de atualização de preços
price_thread = threading.Thread(target=price_updater, daemon=True)
price_thread.start()

# No final do arquivo, trocar:
# app.run(...) 
# POR:
# socketio.run(app, host='0.0.0.0', port=3001, debug=True)

print("🔌 WebSocket habilitado! Preços em tempo real ativados!")
