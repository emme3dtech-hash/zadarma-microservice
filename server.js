// server.js
const express = require('express');
const cors = require('cors');
const ZadarmaAPI = require('./zadarma-api');

const app = express();
const PORT = process.env.PORT || 3000;

// Получение API ключей из переменных окружения
const API_KEY = process.env.API_KEY;
const API_SECRET = process.env.API_SECRET;

// Проверяем наличие ключей
if (!API_KEY || !API_SECRET) {
    console.error('❌ ОШИБКА: API_KEY и API_SECRET должны быть установлены в переменных окружения!');
    console.error('   Установите их в Railway Variables:');
    console.error('   - API_KEY = ваш User Key от Zadarma');
    console.error('   - API_SECRET = ваш Secret Key от Zadarma');
    process.exit(1);
}

console.log('🔑 API ключи загружены:');
console.log('   API_KEY установлен:', !!API_KEY, `(${API_KEY ? API_KEY.length : 0} символов)`);
console.log('   API_SECRET установлен:', !!API_SECRET, `(${API_SECRET ? API_SECRET.length : 0} символов)`);

const zadarma = new ZadarmaAPI(API_KEY, API_SECRET, false);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Логирование запросов
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ===== МАРШРУТЫ API =====

// Главная страница
app.get('/', (req, res) => {
    res.json({
        status: 'success',
        message: 'Zadarma Microservice запущен!',
        version: '2.0.0',
        api_keys_configured: {
            api_key: !!API_KEY,
            api_secret: !!API_SECRET
        },
        endpoints: {
            balance: 'GET /api/balance',
            callback: 'POST /api/callback',
            numbers: 'GET /api/numbers',
            sms: 'POST /api/sms',
            tariffs: 'GET /api/tariffs',
            health: 'GET /health'
        }
    });
});

// Проверка здоровья сервиса
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        api_key_set: !!API_KEY,
        api_secret_set: !!API_SECRET,
        api_key_length: API_KEY ? API_KEY.length : 0,
        api_secret_length: API_SECRET ? API_SECRET.length : 0
    });
});

// Получить баланс
app.get('/api/balance', async (req, res) => {
    try {
        console.log('📊 Запрос баланса...');
        const result = await zadarma.getBalance();
        
        if (result.data.status === 'success') {
            res.json({
                status: 'success',
                data: result.data,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(400).json({
                status: 'error',
                message: result.data.message || 'Неизвестная ошибка API',
                data: result.data,
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('❌ Ошибка получения баланса:', error.message);
        res.status(500).json({
            status: 'error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Инициировать обратный звонок
app.post('/api/callback', async (req, res) => {
    try {
        const { phone_number, contact_name, from_number } = req.body;
        
        if (!phone_number) {
            return res.status(400).json({
                status: 'error',
                message: 'Не указан номер телефона (phone_number)'
            });
        }

        console.log(`📞 Инициация обратного звонка на ${phone_number}`);
        
        // Используем указанный номер или первый доступный
        const fromNumber = from_number || 'auto';
        
        const result = await zadarma.requestCallback(fromNumber, phone_number, false);
        
        if (result.data.status === 'success') {
            res.json({
                status: 'success',
                message: `Обратный звонок инициирован на номер ${phone_number}`,
                contact_name: contact_name || 'Неизвестен',
                data: result.data,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(400).json({
                status: 'error',
                message: result.data.message || 'Ошибка инициации обратного звонка',
                data: result.data,
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('❌ Ошибка обратного звонка:', error.message);
        res.status(500).json({
            status: 'error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Получить список номеров
app.get('/api/numbers', async (req, res) => {
    try {
        console.log('📋 Запрос списка номеров...');
        const result = await zadarma.getNumbers();
        
        if (result.data.status === 'success') {
            res.json({
                status: 'success',
                data: result.data,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(400).json({
                status: 'error',
                message: result.data.message || 'Ошибка получения номеров',
                data: result.data,
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('❌ Ошибка получения номеров:', error.message);
        res.status(500).json({
            status: 'error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Отправить SMS
app.post('/api/sms', async (req, res) => {
    try {
        const { number, message, caller_id } = req.body;
        
        if (!number || !message) {
            return res.status(400).json({
                status: 'error',
                message: 'Не указан номер телефона или текст сообщения'
            });
        }

        console.log(`📱 Отправка SMS на ${number}`);
        const result = await zadarma.sendSMS(number, message, caller_id);
        
        if (result.data.status === 'success') {
            res.json({
                status: 'success',
                message: `SMS отправлено на номер ${number}`,
                data: result.data,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(400).json({
                status: 'error',
                message: result.data.message || 'Ошибка отправки SMS',
                data: result.data,
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('❌ Ошибка отправки SMS:', error.message);
        res.status(500).json({
            status: 'error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Получить тарифы
app.get('/api/tariffs', async (req, res) => {
    try {
        console.log('💰 Запрос тарифов...');
        const result = await zadarma.getTariffs();
        
        if (result.data.status === 'success') {
            res.json({
                status: 'success',
                data: result.data,
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(400).json({
                status: 'error',
                message: result.data.message || 'Ошибка получения тарифов',
                data: result.data,
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('❌ Ошибка получения тарифов:', error.message);
        res.status(500).json({
            status: 'error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Обработка 404
app.use('*', (req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'Эндпоинт не найден',
        available_endpoints: [
            'GET /',
            'GET /health',
            'GET /api/balance',
            'POST /api/callback',
            'GET /api/numbers',
            'POST /api/sms',
            'GET /api/tariffs'
        ]
    });
});

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 Zadarma Microservice запущен!');
    console.log(`🌐 Сервер доступен: http://0.0.0.0:${PORT}`);
    console.log(`📊 API документация: http://localhost:${PORT}`);
    console.log('📞 Готов к обработке запросов...\n');
});

module.exports = app;
