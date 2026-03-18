const os = require('os');
const config = require('./config.js');

class Metrics {
  constructor() {
    this.httpMetrics = { total: 0, get: 0, post: 0, put: 0, delete: 0 };
    this.authMetrics = { successful: 0, failed: 0 };
    this.activeUsers = 0;
    this.pizzaMetrics = { sold: 0, failed: 0, revenue: 0 };
    this.serviceLatency = 0;
    this.pizzaLatency = 0;

    this.sendMetricsPeriodically(10000);
  }

  requestTracker = (req, res, next) => {
    const start = Date.now();
    const method = req.method.toLowerCase();

    this.httpMetrics.total++;
    if (method in this.httpMetrics) {
      this.httpMetrics[method]++;
    }

    res.on('finish', () => {
      this.serviceLatency = Date.now() - start;
    });

    next();
  };

  incrementAuthSuccess() {
    this.authMetrics.successful++;
  }

  incrementAuthFailure() {
    this.authMetrics.failed++;
  }

  incrementActiveUsers() {
    this.activeUsers++;
  }

  decrementActiveUsers() {
    this.activeUsers = Math.max(0, this.activeUsers - 1);
  }

  pizzaPurchase(success, latency, revenue) {
    this.pizzaLatency = latency;
    if (success) {
      this.pizzaMetrics.sold++;
      this.pizzaMetrics.revenue += revenue;
    } else {
      this.pizzaMetrics.failed++;
    }
  }

  getCpuUsagePercentage() {
    const cpuUsage = os.loadavg()[0] / os.cpus().length;
    return (cpuUsage * 100).toFixed(2);
  }

  getMemoryUsagePercentage() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    return ((usedMemory / totalMemory) * 100).toFixed(2);
  }

  sendMetricsPeriodically(period) {
    setInterval(() => {
      try {
        this.sendAllMetrics();
      } catch (error) {
        console.log('Error sending metrics', error);
      }
    }, period);
  }

  sendAllMetrics() {
    this.sendMetricToGrafana('http_requests_total', this.httpMetrics.total, 'sum', '1');
    this.sendMetricToGrafana('http_requests_get', this.httpMetrics.get, 'sum', '1');
    this.sendMetricToGrafana('http_requests_post', this.httpMetrics.post, 'sum', '1');
    this.sendMetricToGrafana('http_requests_put', this.httpMetrics.put, 'sum', '1');
    this.sendMetricToGrafana('http_requests_delete', this.httpMetrics.delete, 'sum', '1');

    this.sendMetricToGrafana('auth_successful', this.authMetrics.successful, 'sum', '1');
    this.sendMetricToGrafana('auth_failed', this.authMetrics.failed, 'sum', '1');

    this.sendMetricToGrafana('active_users', this.activeUsers, 'gauge', '1');

    this.sendMetricToGrafana('cpu_usage', this.getCpuUsagePercentage(), 'gauge', '%');
    this.sendMetricToGrafana('memory_usage', this.getMemoryUsagePercentage(), 'gauge', '%');

    this.sendMetricToGrafana('pizzas_sold', this.pizzaMetrics.sold, 'sum', '1');
    this.sendMetricToGrafana('pizza_failures', this.pizzaMetrics.failed, 'sum', '1');
    this.sendMetricToGrafana('pizza_revenue', Math.round(this.pizzaMetrics.revenue * 1000), 'sum', 'mBTC');

    this.sendMetricToGrafana('service_latency', this.serviceLatency, 'gauge', 'ms');
    this.sendMetricToGrafana('pizza_creation_latency', this.pizzaLatency, 'gauge', 'ms');
  }

  sendMetricToGrafana(metricName, metricValue, type, unit) {
    if (!config.metrics || !config.metrics.endpointUrl || config.metrics.endpointUrl === 'your-grafana-otlp-endpoint') {
      return;
    }

    const metric = {
      resourceMetrics: [
        {
          resource: {
            attributes: [
              {
                key: 'service.name',
                value: { stringValue: config.metrics.source },
              },
            ],
          },
          scopeMetrics: [
            {
              metrics: [
                {
                  name: metricName,
                  unit: unit,
                  [type]: {
                    dataPoints: [
                      {
                        asDouble: parseFloat(metricValue),
                        timeUnixNano: Date.now() * 1000000,
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    if (type === 'sum') {
      metric.resourceMetrics[0].scopeMetrics[0].metrics[0][type].aggregationTemporality = 'AGGREGATION_TEMPORALITY_CUMULATIVE';
      metric.resourceMetrics[0].scopeMetrics[0].metrics[0][type].isMonotonic = true;
    }

    const body = JSON.stringify(metric);
    fetch(config.metrics.endpointUrl, {
      method: 'POST',
      body: body,
      headers: {
        Authorization: `Bearer ${config.metrics.accountId}:${config.metrics.apiKey}`,
        'Content-Type': 'application/json',
      },
    })
      .then((response) => {
        if (!response.ok) {
          response.text().then((text) => {
            console.error(`Failed to push metric ${metricName}: ${text}`);
          });
        }
      })
      .catch((error) => {
        console.error('Error pushing metrics:', error);
      });
  }
}

const metrics = new Metrics();
module.exports = metrics;
