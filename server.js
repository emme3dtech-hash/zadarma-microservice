const express = require('express');
const cors = require('cors');
const { api } = require('zadarma');

const app = express();

// --- НАСТРОЙКА ---
const API_KEY = process.env.API_KEY;
const API_SECRET = process.env.API_SECRET;
// РЕКОМЕНДАЦИЯ: Укажите ваш CallerID по умолчанию в переменных окружения на Railway
const DEFAULT_CALLER_ID = process.env.DEFAULT_CALLER_ID; 

if (!API_KEY || !API_SECRET) {
    console.error('API_KEY и API_SECRET должны быть установлены в переменных окружения');
    process.exit(1);
}

// Настройка переменных окружения для модуля zadarma
process.env.ZADARMA_USER_KEY = API_KEY;
process.env.ZADARMA_SECRET_KEY = API_SECRET;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Логирование запросов
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// --- РОУТЫ ---

// Главная страница
app.get('/', (req, res) => {
    res.json({
        status: 'success',
        message: 'Zadarma Microservice запущен!',
        version: '1.1.0 (Исправлено)',
    });
});

// Инициировать обратный звонок
app.post('/api/callback', async (req, res) => {
    try {
        // ИЗМЕНЕНИЕ: Получаем 'from_number' из тела запроса
        const { phone_number, from_number, contact_name } = req.body;
        
        if (!phone_number) {
            return res.status(400).json({
                status: 'error',
                message: 'Не указан номер телефона (phone_number)'
            });
        }
        
        // ИЗМЕНЕНИЕ: Определяем, какой номер использовать для CallerID
        // Если from_number передан из n8n - используем его.
        // Если нет - используем номер по умолчанию из переменных окружения.
        const callerId = from_number || DEFAULT_CALLER_ID;

        if (!callerId) {
             return res.status(400).json({
                status: 'error',
                message: 'Не указан номер для совершения звонка (from_number) и не задан DEFAULT_CALLER_ID'
            });
        }

        console.log(`Инициация обратного звонка с ${callerId} на ${phone_number}`);
        
        // ИСПРАВЛЕНИЕ: Используем динамический callerId
        const params = {
            from: callerId,
            to: phone_number
        };
        
        const result = await api({
            api_method: '/v1/request/callback/',
            params: params
        });
        
        res.json({
            status: 'success',
            message: `Обратный звонок инициирован с ${callerId} на номер ${phone_number}`,
            contact_name: contact_name || 'Неизвестен',
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Ошибка обратного звонка:', error.message, error);
        res.status(500).json({
            status: 'error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

const PORT_LISTEN = process.env.PORT || 3000;
app.listen(PORT_LISTEN, '0.0.0.0', () => {
    console.log(`Zadarma микросервис запущен на порту ${PORT_LISTEN}`);
    console.log(`API Key установлен: ${!!API_KEY}`);
    console.log(`API Secret установлен: ${!!API_SECRET}`);
    console.log(`CallerID по умолчанию: ${DEFAULT_CALLER_ID || 'Не задан'}`);
});
