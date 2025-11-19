const { loadConfig, displayConfig } = require('./config');
const TrxForwarder = require('./forwarder');
const logger = require('./logger');

/**
 * Главная функция приложения
 */
async function main() {
  try {
    // ASCII баннер
    console.log('\n');
    logger.header('🚀 TRX AUTO FORWARDER 🚀');
    console.log('\n');
    logger.info('Автоматическая пересылка TRX токенов');
    logger.info('Версия: 1.0.0');
    logger.separator();

    // Загрузка конфигурации
    logger.info('Загрузка конфигурации...');
    const config = loadConfig();
    logger.success('Конфигурация загружена успешно');
    logger.separator();

    // Отображение конфигурации
    displayConfig(config);

    // Создание и запуск форвардера
    const forwarder = new TrxForwarder(config);
    await forwarder.start();

    // Обработчик graceful shutdown при Ctrl+C
    process.on('SIGINT', async () => {
      console.log('\n');
      logger.separator('═');
      logger.warning('Получен сигнал остановки (Ctrl+C)');
      logger.info('Завершение работы приложения...');

      // Останавливаем мониторинг
      forwarder.stop();

      logger.success('Приложение остановлено');
      logger.separator('═');

      process.exit(0);
    });

    // Обработчик SIGTERM
    process.on('SIGTERM', async () => {
      console.log('\n');
      logger.warning('Получен сигнал SIGTERM');
      logger.info('Завершение работы приложения...');

      forwarder.stop();

      logger.success('Приложение остановлено');
      process.exit(0);
    });
  } catch (error) {
    logger.error('Критическая ошибка в приложении', error);
    process.exit(1);
  }
}

/**
 * Обработчик необработанных исключений
 */
process.on('uncaughtException', (error) => {
  logger.error('Необработанное исключение', error);
  logger.info('Приложение будет продолжать работу...');
});

/**
 * Обработчик необработанных отклонений промисов
 */
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Необработанное отклонение промиса', reason);
  logger.info('Приложение будет продолжать работу...');
});

// Запуск приложения
if (require.main === module) {
  main();
}

module.exports = { main };
