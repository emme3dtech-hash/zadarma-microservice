// zadarma-api.js
const { api } = require('zadarma');

class ZadarmaAPI {
    constructor(key, secret, sandbox = false) {
        this.key = key;
        this.secret = secret;
        
        // Устанавливаем переменные окружения для модуля zadarma
        process.env.ZADARMA_USER_KEY = key;
        process.env.ZADARMA_SECRET_KEY = secret;
        
        console.log('🔧 ZadarmaAPI инициализирован:');
        console.log('   Key установлен:', !!key, `(${key ? key.length : 0} символов)`);
        console.log('   Secret установлен:', !!secret, `(${secret ? secret.length : 0} символов)`);
        console.log('   Sandbox режим:', sandbox);
    }

    async getBalance() {
        try {
            console.log('📊 Запрос баланса через NPM модуль...');
            
            const result = await api({
                api_method: '/v1/info/balance/'
            });
            
            console.log('✅ Результат запроса баланса:', result);
            
            return {
                status: 200,
                data: result
            };
        } catch (error) {
            console.error('❌ Ошибка получения баланса:', error);
            throw new Error('Ошибка получения баланса: ' + error.message);
        }
    }

    async requestCallback(from, to, predicted = false) {
        try {
            console.log(`📞 Запрос обратного звонка: ${from} -> ${to}`);
            
            const params = {
                from: from,
                to: to
            };
            
            if (predicted) {
                params.predicted = 'predicted';
            }
            
            const result = await api({
                api_method: '/v1/request/callback/',
                params: params
            });
            
            console.log('✅ Результат обратного звонка:', result);
            
            return {
                status: 200,
                data: result
            };
        } catch (error) {
            console.error('❌ Ошибка обратного звонка:', error);
            throw new Error('Ошибка инициации обратного звонка: ' + error.message);
        }
    }

    async getNumbers() {
        try {
            console.log('📋 Запрос списка прямых номеров...');
            
            const result = await api({
                api_method: '/v1/direct_numbers/'
            });
            
            console.log('✅ Результат запроса номеров:', result);
            
            return {
                status: 200,
                data: result
            };
        } catch (error) {
            console.error('❌ Ошибка получения номеров:', error);
            throw new Error('Ошибка получения номеров: ' + error.message);
        }
    }

    async sendSMS(number, message, caller_id = null) {
        try {
            console.log(`📱 Отправка SMS на ${number}: ${message.substring(0, 50)}...`);
            
            const params = {
                number: number,
                message: message
            };
            
            if (caller_id) {
                params.caller_id = caller_id;
            }
            
            const result = await api({
                http_method: 'POST',
                api_method: '/v1/sms/send/',
                params: params
            });
            
            console.log('✅ Результат отправки SMS:', result);
            
            return {
                status: 200,
                data: result
            };
        } catch (error) {
            console.error('❌ Ошибка отправки SMS:', error);
            throw new Error('Ошибка отправки SMS: ' + error.message);
        }
    }

    async getTariffs() {
        try {
            console.log('💰 Запрос тарифов...');
            
            const result = await api({
                api_method: '/v1/tariff/'
            });
            
            console.log('✅ Результат запроса тарифов:', result);
            
            return {
                status: 200,
                data: result
            };
        } catch (error) {
            console.error('❌ Ошибка получения тарифов:', error);
            throw new Error('Ошибка получения тарифов: ' + error.message);
        }
    }

    async getSipNumbers() {
        try {
            console.log('📞 Запрос SIP номеров...');
            
            const result = await api({
                api_method: '/v1/sip/'
            });
            
            console.log('✅ Результат запроса SIP:', result);
            
            return {
                status: 200,
                data: result
            };
        } catch (error) {
            console.error('❌ Ошибка получения SIP номеров:', error);
            throw new Error('Ошибка получения SIP номеров: ' + error.message);
        }
    }
}

module.exports = ZadarmaAPI;
