require('dotenv').config();
const logger = require('./logger');

/**
 * Валидация адреса TRON кошелька
 * Адрес должен начинаться с 'T' и иметь длину 34 символа
 */
function isValidTronAddress(address) {
  if (!address || typeof address !== 'string') {
    return false;
  }
  return address.startsWith('T') && address.length === 34;
}

/**
 * Валидация приватного ключа
 * Должен быть hex строкой длиной 64 символа
 */
function isValidPrivateKey(key) {
  if (!key || typeof key !== 'string') {
    return false;
  }
  return /^[0-9a-fA-F]{64}$/.test(key);
}

/**
 * Загрузка и валидация конфигурации из .env файла
 */
function loadConfig() {
  const config = {
    // Приватный ключ промежуточного кошелька
    privateKey: process.env.PRIVATE_KEY,

    // Адрес отслеживаемого кошелька
    watchAddress: process.env.WATCH_ADDRESS,

    // Адрес куда переводить средства
    destinationAddress: process.env.DESTINATION_ADDRESS,

    // Минимальная сумма для перевода (в TRX)
    minAmount: parseFloat(process.env.MIN_AMOUNT) || 1.5,

    // Резерв на комиссии (в TRX)
    reserveAmount: parseFloat(process.env.RESERVE_AMOUNT) || 1,

    // Интервал проверки баланса (в миллисекундах)
    checkInterval: parseInt(process.env.CHECK_INTERVAL) || 3000,

    // API ключ TronGrid (опционально)
    tronApiKey: process.env.TRON_API_KEY || null,
  };

  // Валидация обязательных параметров
  const errors = [];

  if (!config.privateKey) {
    errors.push('PRIVATE_KEY не указан в .env файле');
  } else if (!isValidPrivateKey(config.privateKey)) {
    errors.push('PRIVATE_KEY имеет неверный формат (должен быть hex строкой из 64 символов)');
  }

  if (!config.watchAddress) {
    errors.push('WATCH_ADDRESS не указан в .env файле');
  } else if (!isValidTronAddress(config.watchAddress)) {
    errors.push('WATCH_ADDRESS имеет неверный формат (должен начинаться с T и иметь длину 34)');
  }

  if (!config.destinationAddress) {
    errors.push('DESTINATION_ADDRESS не указан в .env файле');
  } else if (!isValidTronAddress(config.destinationAddress)) {
    errors.push('DESTINATION_ADDRESS имеет неверный формат (должен начинаться с T и иметь длину 34)');
  }

  // Валидация числовых параметров
  if (isNaN(config.minAmount) || config.minAmount <= 0) {
    errors.push('MIN_AMOUNT должен быть положительным числом');
  }

  if (isNaN(config.reserveAmount) || config.reserveAmount < 0) {
    errors.push('RESERVE_AMOUNT должен быть неотрицательным числом');
  }

  if (config.minAmount <= config.reserveAmount) {
    errors.push('MIN_AMOUNT должен быть больше RESERVE_AMOUNT');
  }

  if (isNaN(config.checkInterval) || config.checkInterval < 1000) {
    errors.push('CHECK_INTERVAL должен быть не менее 1000 мс');
  }

  // Если есть ошибки, выводим их и завершаем работу
  if (errors.length > 0) {
    logger.error('Ошибки в конфигурации:');
    errors.forEach((error) => {
      logger.error(`  • ${error}`);
    });
    logger.info('\nПроверьте файл .env и убедитесь, что все параметры указаны правильно.');
    logger.info('Пример файла .env можно найти в .env.example');
    process.exit(1);
  }

  return config;
}

/**
 * Отображение текущей конфигурации (без приватного ключа)
 */
function displayConfig(config) {
  logger.header('КОНФИГУРАЦИЯ ПРИЛОЖЕНИЯ');

  logger.config(`Отслеживаемый кошелек: ${config.watchAddress}`);
  logger.config(`Целевой кошелек: ${config.destinationAddress}`);
  logger.config(`Минимальная сумма перевода: ${config.minAmount} TRX`);
  logger.config(`Резерв на комиссии: ${config.reserveAmount} TRX`);
  logger.config(`Интервал проверки: ${config.checkInterval / 1000} сек`);
  logger.config(`TronGrid API ключ: ${config.tronApiKey ? 'Установлен ✓' : 'Не установлен'}`);

  logger.separator();
}

module.exports = {
  loadConfig,
  displayConfig,
  isValidTronAddress,
  isValidPrivateKey,
};
