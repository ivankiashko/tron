const TronService = require('./tronService');
const logger = require('./logger');

/**
 * Класс для автоматической пересылки TRX токенов
 */
class TrxForwarder {
  constructor(config) {
    this.config = config;
    this.tronService = new TronService(config.privateKey, config.tronApiKey);
    this.lastBalance = 0;
    this.isProcessing = false;
    this.checkIntervalId = null;

    // Статистика за сессию
    this.stats = {
      transfersCount: 0,
      totalAmount: 0,
      startTime: Date.now(),
    };
  }

  /**
   * Запуск мониторинга баланса
   */
  async start() {
    try {
      logger.info('Запуск TRX Auto Forwarder...');

      // Получаем адрес кошелька из приватного ключа
      const sourceAddress = this.tronService.getAddress();
      logger.info(`Адрес промежуточного кошелька: ${sourceAddress}`);

      // Проверяем начальный баланс
      const initialBalance = await this.tronService.getBalance(this.config.watchAddress);
      this.lastBalance = initialBalance;

      logger.balance(`Начальный баланс: ${this.tronService.formatTrx(initialBalance)} TRX`);
      logger.separator();

      // Запускаем мониторинг
      logger.monitor('Мониторинг запущен. Ожидание поступления TRX...');
      logger.info(`Проверка баланса каждые ${this.config.checkInterval / 1000} секунд`);
      logger.separator();

      // Запускаем периодическую проверку
      this.checkIntervalId = setInterval(
        () => this.checkBalance(),
        this.config.checkInterval
      );

      // Делаем первую проверку сразу
      await this.checkBalance();
    } catch (error) {
      logger.error('Ошибка при запуске форвардера', error);
      throw error;
    }
  }

  /**
   * Остановка мониторинга
   */
  stop() {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
      logger.info('Мониторинг остановлен');
      this.displayStats();
    }
  }

  /**
   * Проверка баланса и обнаружение новых поступлений
   */
  async checkBalance() {
    // Если уже обрабатываем транзакцию, пропускаем проверку
    if (this.isProcessing) {
      logger.warning('Транзакция уже обрабатывается, пропускаем проверку');
      return;
    }

    try {
      // Получаем текущий баланс
      const currentBalance = await this.tronService.getBalance(this.config.watchAddress);

      // Проверяем, увеличился ли баланс
      if (currentBalance > this.lastBalance) {
        const receivedAmount = currentBalance - this.lastBalance;

        logger.separator('─');
        logger.success(`Обнаружено новое поступление!`);
        logger.balance(`Получено: ${this.tronService.formatTrx(receivedAmount)} TRX`);
        logger.balance(`Новый баланс: ${this.tronService.formatTrx(currentBalance)} TRX`);
        logger.separator('─');

        // Обновляем последний известный баланс
        this.lastBalance = currentBalance;

        // Пытаемся отправить средства
        await this.forwardTRX(currentBalance);
      } else if (currentBalance < this.lastBalance) {
        // Баланс уменьшился (возможно, была комиссия или отправка)
        logger.warning(`Баланс уменьшился: ${this.tronService.formatTrx(this.lastBalance)} → ${this.tronService.formatTrx(currentBalance)} TRX`);
        this.lastBalance = currentBalance;
      }
      // Если баланс не изменился, ничего не делаем (не логируем для чистоты вывода)
    } catch (error) {
      logger.error('Ошибка при проверке баланса', error);
      // Продолжаем работу при временных ошибках
    }
  }

  /**
   * Пересылка TRX на целевой кошелек
   * @param {number} balance - Текущий баланс кошелька
   */
  async forwardTRX(balance) {
    // Устанавливаем флаг обработки
    this.isProcessing = true;

    try {
      // Проверяем минимальную сумму
      if (balance < this.config.minAmount) {
        logger.warning(
          `Баланс ${this.tronService.formatTrx(balance)} TRX меньше минимальной суммы ${this.config.minAmount} TRX`
        );
        logger.info('Пересылка не выполнена');
        return;
      }

      // Рассчитываем сумму к отправке (баланс - резерв)
      const amountToSend = balance - this.config.reserveAmount;

      if (amountToSend <= 0) {
        logger.warning(
          `После вычета резерва (${this.config.reserveAmount} TRX) не осталось средств для пересылки`
        );
        return;
      }

      logger.info('═══════════════════════════════════════════════════════');
      logger.transfer(`Подготовка к пересылке:`);
      logger.transfer(`  Баланс: ${this.tronService.formatTrx(balance)} TRX`);
      logger.transfer(`  Резерв: ${this.tronService.formatTrx(this.config.reserveAmount)} TRX`);
      logger.transfer(`  К отправке: ${this.tronService.formatTrx(amountToSend)} TRX`);
      logger.transfer(`  Получатель: ${this.config.destinationAddress}`);
      logger.info('═══════════════════════════════════════════════════════');

      // Отправляем транзакцию
      const result = await this.tronService.sendTrx(
        this.config.destinationAddress,
        amountToSend
      );

      if (result.success) {
        // Обновляем статистику
        this.stats.transfersCount++;
        this.stats.totalAmount += amountToSend;

        logger.success('✓ Пересылка выполнена успешно!');
        logger.info('═══════════════════════════════════════════════════════');

        // Обновляем последний баланс (должен остаться резерв)
        setTimeout(async () => {
          try {
            const newBalance = await this.tronService.getBalance(this.config.watchAddress);
            this.lastBalance = newBalance;
            logger.balance(`Остаток на кошельке: ${this.tronService.formatTrx(newBalance)} TRX`);
          } catch (error) {
            logger.error('Ошибка при получении нового баланса', error);
          }
        }, 5000); // Ждем 5 секунд для подтверждения транзакции
      }
    } catch (error) {
      logger.error('Ошибка при пересылке TRX', error);

      // Проверяем специфические ошибки
      if (error.message && error.message.includes('balance is not sufficient')) {
        logger.error('Недостаточно средств для оплаты комиссии за транзакцию');
        logger.info('Возможно, нужно увеличить RESERVE_AMOUNT в конфигурации');
      }
    } finally {
      // Снимаем флаг обработки
      this.isProcessing = false;
    }
  }

  /**
   * Отображение статистики за сессию
   */
  displayStats() {
    const runTime = Math.floor((Date.now() - this.stats.startTime) / 1000);
    const hours = Math.floor(runTime / 3600);
    const minutes = Math.floor((runTime % 3600) / 60);
    const seconds = runTime % 60;

    logger.separator('═');
    logger.info('СТАТИСТИКА ЗА СЕССИЮ:');
    logger.separator('─');
    logger.info(`Время работы: ${hours}ч ${minutes}м ${seconds}с`);
    logger.info(`Количество переводов: ${this.stats.transfersCount}`);
    logger.info(`Общая сумма переведенных средств: ${this.tronService.formatTrx(this.stats.totalAmount)} TRX`);
    logger.separator('═');
  }

  /**
   * Получить текущую статистику
   */
  getStats() {
    return {
      ...this.stats,
      runTime: Date.now() - this.stats.startTime,
    };
  }
}

module.exports = TrxForwarder;
