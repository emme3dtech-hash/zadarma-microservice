const express = require('express');
const cors = require('cors');
const { api } = require('zadarma');

// --- Версия 2.4 (исправленная для автопроигрывания) ---
const app = express();

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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Логирование запросов
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Вспомогательная функция для ожидания
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Функция для проверки статуса TTS файла
async function checkTtsStatus(fileId, maxAttempts = 10) {
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const statusResult = await api({
                api_method: '/v1/tts/',
                params: {
                    id: fileId
                }
            });
            
            console.log(`Проверка статуса TTS (попытка ${i + 1}):`, statusResult);
            
            if (statusResult.status === 'success' && statusResult.files && statusResult.files[fileId]) {
                const fileInfo = statusResult.files[fileId];
                if (fileInfo.status === 'completed') {
                    console.log(`TTS файл ${fileId} готов`);
                    return true;
                }
            }
            
            // Ждем 2 секунды перед следующей попыткой
            await delay(2000);
        } catch (error) {
            console.error(`Ошибка при проверке статуса TTS (попытка ${i + 1}):`, error.message);
            await delay(2000);
        }
    }
    
    return false;
}

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
            api_method: '/v1/tts/',
            params: {
                text: speech_text
            }
        });

        console.log('Результат синтеза речи:', synthesisResult);

        if (synthesisResult.status !== 'success' || !synthesisResult.ids || synthesisResult.ids.length === 0) {
            throw new Error('Не удалось синтезировать речь: ' + (synthesisResult.message || JSON.stringify(synthesisResult)));
        }

        const speechId = synthesisResult.ids[0];
        console.log(`Речь отправлена на синтез. ID файла: ${speechId}`);
        
        // --- Шаг 2: Ожидание готовности TTS файла ---
        console.log('Ожидаем готовности TTS файла...');
        const ttsReady = await checkTtsStatus(speechId);
        
        if (!ttsReady) {
            throw new Error('TTS файл не был готов в течение ожидаемого времени');
        }

        // --- Шаг 3: Инициация исходящего звонка с автопроигрыванием ---
        console.log(`Звоним на ${phone_number} и проигрываем файл ${speechId}`);
        
        // ПРАВИЛЬНЫЙ МЕТОД: Исходящий звонок с автоматическим проигрыванием файла
        const callResult = await api({
            api_method: '/v1/request/call/',
            params: {
                caller_id: CALLER_ID,    // С какого номера звоним
                to: phone_number,        // На какой номер звоним  
                scenario: 'play',        // Сценарий - проиграть файл
                play: speechId          // ID файла для проигрывания
            }
        });

        console.log('Результат звонка:', callResult);

        if (callResult.status === 'success') {
            res.json({
                status: 'success',
                message: `Автообзвон для номера ${phone_number} успешно запущен с проигрыванием аудио.`,
                data: {
                    call_id: callResult.call_id || null,
                    speech_id: speechId,
                    phone_number: phone_number,
                    to: phone_number
                }
            });
        } else {
            throw new Error('Не удалось инициировать звонок: ' + (callResult.message || JSON.stringify(callResult)));
        }

    } catch (error) {
        console.error('Ошибка автообзвона:', error.message);
        console.error('Stack trace:', error.stack);
        
        res.status(500).json({
            status: 'error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// --- АЛЬТЕРНАТИВНЫЙ МЕТОД С ИСПОЛЬЗОВАНИЕМ SCENARIO ---
app.post('/api/autocall/scenario', async (req, res) => {
    try {
        console.log('Полученное тело запроса (req.body):', JSON.stringify(req.body, null, 2));
        const { phone_number, speech_text } = req.body;
        
        if (!phone_number || !speech_text) {
            return res.status(400).json({
                status: 'error',
                message: 'Необходимо указать phone_number и speech_text'
            });
        }

        console.log(`Начинаем процесс автообзвона через scenario для номера: ${phone_number}`);
        
        // --- Шаг 1: Синтез речи ---
        const synthesisResult = await api({
            api_method: '/v1/tts/',
            params: {
                text: speech_text
            }
        });

        if (synthesisResult.status !== 'success' || !synthesisResult.ids || synthesisResult.ids.length === 0) {
            throw new Error('Не удалось синтезировать речь: ' + (synthesisResult.message || JSON.stringify(synthesisResult)));
        }

        const speechId = synthesisResult.ids[0];
        console.log(`Речь синтезирована. ID файла: ${speechId}`);
        
        // --- Шаг 2: Ожидание готовности ---
        const ttsReady = await checkTtsStatus(speechId);
        if (!ttsReady) {
            throw new Error('TTS файл не был готов в течение ожидаемого времени');
        }

        // --- Шаг 3: Создание сценария для автопроигрывания ---
        console.log('Создаем сценарий для автопроигрывания...');
        
        const scenarioResult = await api({
            api_method: '/v1/scenario/create/',
            params: {
                name: `autocall_${Date.now()}`,
                description: 'Автоматический звонок с проигрыванием TTS',
                scenario: JSON.stringify([
                    {
                        "action": "play",
                        "file_id": speechId
                    },
                    {
                        "action": "hangup"
                    }
                ])
            }
        });

        if (scenarioResult.status !== 'success') {
            throw new Error('Не удалось создать сценарий: ' + (scenarioResult.message || JSON.stringify(scenarioResult)));
        }

        const scenarioId = scenarioResult.scenario_id;
        console.log(`Сценарий создан. ID: ${scenarioId}`);

        // --- Шаг 4: Запуск звонка со сценарием ---
        const callResult = await api({
            api_method: '/v1/request/call/',
            params: {
                caller_id: CALLER_ID,
                to: phone_number,
                scenario_id: scenarioId
            }
        });

        console.log('Результат звонка со сценарием:', callResult);

        if (callResult.status === 'success') {
            res.json({
                status: 'success',
                message: `Автообзвон со сценарием для номера ${phone_number} успешно запущен.`,
                data: {
                    call_id: callResult.call_id || null,
                    scenario_id: scenarioId,
                    speech_id: speechId,
                    phone_number: phone_number
                }
            });
        } else {
            throw new Error('Не удалось запустить звонок со сценарием: ' + (callResult.message || JSON.stringify(callResult)));
        }

    } catch (error) {
        console.error('Ошибка автообзвона со сценарием:', error.message);
        res.status(500).json({
            status: 'error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// --- ДОПОЛНИТЕЛЬНЫЕ ЭНДПОИНТЫ ---

// Проверка статуса TTS файла
app.get('/api/tts/status/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        
        const statusResult = await api({
            api_method: '/v1/tts/',
            params: {
                id: fileId
            }
        });
        
        res.json(statusResult);
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Проверка баланса
app.get('/api/balance', async (req, res) => {
    try {
        const balanceResult = await api({
            api_method: '/v1/info/balance/'
        });
        
        res.json(balanceResult);
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Получение списка сценариев
app.get('/api/scenarios', async (req, res) => {
    try {
        const scenariosResult = await api({
            api_method: '/v1/scenario/'
        });
        
        res.json(scenariosResult);
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        version: '2.4'
    });
});

const PORT_LISTEN = process.env.PORT || 3000;
app.listen(PORT_LISTEN, '0.0.0.0', () => {
    console.log(`Zadarma микросервис (Версия 2.4) запущен на порту ${PORT_LISTEN}`);
    console.log(`API Key установлен: ${!!API_KEY}`);
    console.log(`API Secret установлен: ${!!API_SECRET}`);
    console.log(`CALLER_ID установлен: ${CALLER_ID}`);
    console.log('Доступные эндпоинты:');
    console.log('  POST /api/autocall - Основной метод автообзвона');
    console.log('  POST /api/autocall/scenario - Альтернативный метод через сценарии');
    console.log('  GET /api/balance - Проверка баланса');
    console.log('  GET /api/scenarios - Список сценариев');
});
