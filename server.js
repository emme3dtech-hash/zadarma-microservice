const express = require('express');
const cors = require('cors');
const { api } = require('zadarma');

const app = express();
const PORT = process.env.PORT || 3000;

// Получение API ключей из переменных окружения
const API_KEY = process.env.API_KEY;
const API_SECRET = process.env.API_SECRET;

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

// Главная страница
app.get('/', (req, res) => {
    res.json({
        status: 'success',
        message: 'Zadarma Microservice запущен!',
        version: '1.0.1 (Исправлен CallerID)',
    });
});

// Инициировать обратный звонок
app.post('/api/callback', async (req, res) => {
    try {
        const { phone_number, contact_name } = req.body;
        
        if (!phone_number) {
            return res.status(400).json({
                status: 'error',
                message: 'Не указан номер телефона (phone_number)'
            });
        }

        console.log(`Инициация обратного звонка на ${phone_number}`);
        
        const params = {
            // ИСПРАВЛЕНИЕ: Указан ваш корректный, подтвержденный номер для звонков
            from: '0967546763', 
            to: phone_number
        };
        
        const result = await api({
            api_method: '/v1/request/callback/',
            params: params
        });
        
        res.json({
            status: 'success',
            message: `Обратный звонок инициирован на номер ${phone_number}`,
            contact_name: contact_name || 'Неизвестен',
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Ошибка обратного звонка:', error.message);
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
});




