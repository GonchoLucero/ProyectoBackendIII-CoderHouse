import config from '../config/index.js';
import { getDatabaseStatus } from '../config/db.config.js';

class HealthService {
  getStatus() {
    return {
      api: 'ok',
      environment: config.nodeEnv,
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      database: getDatabaseStatus(),
    };
  }
}

export default new HealthService();
