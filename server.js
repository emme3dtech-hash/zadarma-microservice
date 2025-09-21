// server.js
const express = require('express');
const cors = require('cors');
const ZadarmaAPI = require('./zadarma-api');

const app = express();
const PORT = process.env.PORT || 3000;

// Ваши API ключи Zadarma (замените на свои!)
const API_KEY = '7083ddb1412389ca21a5';
const API_SECRET = '94b05a1ae04308070adc';

sandbox = false
const zadarma = new ZadarmaAPI(API_KEY, API_SECRET, true);

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
        version: '1.0.0',
        endpoints: {
            balance: 'GET /api/balance',
            callback: 'POST /api/callback',
            numbers: 'GET /api/numbers',
            sms: 'POST /api/sms',
            tariffs: 'GET /api/tariffs'
        }
    });
});

// Получить баланс
app.get('/api/balance', async (req, res) => {
    try {
        console.log('📊 Запрос баланса...');
        const result = await zadarma.getBalance();
        
        res.json({
            status: 'success',
            data: result.data,
            timestamp: new Date().toISOString()
        });
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
        
        // Используем первый доступный номер как исходящий (или указанный)
        const fromNumber = from_number || 'auto'; // Zadarma автоматически выберет номер
        
        const result = await zadarma.requestCallback(fromNumber, phone_number, false);
        
        res.json({
            status: 'success',
            message: `Обратный звонок инициирован на номер ${phone_number}`,
            contact_name: contact_name || 'Неизвестен',
            data: result.data,
            timestamp: new Date().toISOString()
        });
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
        
        res.json({
            status: 'success',
            data: result.data,
            timestamp: new Date().toISOString()
        });
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
        const { number, message } = req.body;
        
        if (!number || !message) {
            return res.status(400).json({
                status: 'error',
                message: 'Не указан номер телефона или текст сообщения'
            });
        }

        console.log(`📱 Отправка SMS на ${number}`);
        const result = await zadarma.sendSMS(number, message);
        
        res.json({
            status: 'success',
            message: `SMS отправлено на номер ${number}`,
            data: result.data,
            timestamp: new Date().toISOString()
        });
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
        
        res.json({
            status: 'success',
            data: result.data,
            timestamp: new Date().toISOString()
        });
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