const express = require('express');
const cors = require('cors');
const { api } = require('zadarma');

// --- Версия 2.1 ---

const app = express();
const PORT = process.env.PORT || 3000;

// Получение API ключей и CallerID из переменных окружения
const API_KEY = process.env.API_KEY;
const API_SECRET = process.env.API_SECRET;
const CALLER_ID = process.env.CALLER_ID; 

if (!API_KEY || !API_SECRET || !CALLER_ID) {
    console.error('API_KEY, API_SECRET и CALLER_ID должны быть установлены в переменных окружения');
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


// --- ЭНДПОИНТ ДЛЯ АВТООБЗВОНА ---
app.post('/api/autocall', async (req, res) => {
    try {
        console.log('Полученное тело запроса (req.body):', JSON.stringify(req.body, null, 2));

        const { phone_number, speech_text } = req.body;
        
        if (!phone_number || !speech_text) {
            return res.status(400).json({
                status: 'error',
                message: 'Необходимо указать phone_number и speech_text'
            });
        }

        console.log(`Начинаем процесс автообзвона для номера: ${phone_number}`);

        // --- Шаг 1: Синтез речи через API Zadarma ---
        console.log('Синтезируем речь...');
        const synthesisResult = await api({
            // ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ: Указан 100% правильный метод API для TTS
            api_method: '/v1/tts/', 
            params: {
                text: speech_text,
            }
        });

        if (synthesisResult.status !== 'success' || !synthesisResult.ids || synthesisResult.ids.length === 0) {
            // Эта ошибка будет видна, если Zadarma вернет ошибку (например, "недостаточно средств")
            throw new Error('Не удалось синтезировать речь: ' + (synthesisResult.message || JSON.stringify(synthesisResult)));
        }
        
        const speechId = synthesisResult.ids[0];
        console.log(`Речь успешно синтезирована. ID файла: ${speechId}`);

        // --- Шаг 2: Инициация звонка с проигрыванием синтезированного файла ---
        console.log(`Звоним на ${phone_number} и проигрываем файл ${speechId}`);
        const callResult = await api({
            api_method: '/v1/call/start/',
            params: {
                from: CALLER_ID,
                to: phone_number,
                play: speechId 
            }
        });

        res.json({
            status: 'success',
            message: `Автообзвон для номера ${phone_number} успешно запущен.`,
            call_data: callResult
        });

    } catch (error) {
        console.error('Ошибка автообзвона:', error.message, error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});


const PORT_LISTEN = process.env.PORT || 3000;
app.listen(PORT_LISTEN, '0.0.0.0', () => {
    console.log(`Zadarma микросервис запущен на порту ${PORT_LISTEN}`);
    console.log(`API Key установлен: ${!!API_KEY}`);
    console.log(`API Secret установлен: ${!!API_SECRET}`);
    console.log(`CALLER_ID установлен: ${CALLER_ID}`);
});

