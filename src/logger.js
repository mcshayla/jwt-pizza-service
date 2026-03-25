const Logger = require('pizza-logger')
const config = require('./config.js')


const logger = new Logger(config)

module.exports = logger;


// functions: 
// httpLogger	app.use(logger.httpLogger);
// dbLogger	Logger.dbLogger(sqlQuery)
// factoryLogger	Logger.factoryLogger(orderInfo)
// unhandledErrorLogger	Logger.unhandledErrorLogger(err)

//db logger: 
// async query(connection, sql, params) {
//     logger.dbLogger(sql);
//     const [results] = await connection.execute(sql, params);
//     return results;
// }

//factory logger:
// orderRouter.post(
//   '/',
//   authRouter.authenticateToken,
//   asyncHandler(async (req, res) => {
//     const orderReq = req.body;
//     const order = await DB.addDinerOrder(req.user, orderReq);
//     const orderInfo = { diner: { id: req.user.id, name: req.user.name, email: req.user.email }, order };
//     logger.factoryLogger(orderInfo);


// class StatusCodeError extends Error {
//   constructor(message, statusCode) {
//     super(message);
//     logger.unhandledErrorLogger(this);
//     this.statusCode = statusCode;
//   }
// }


// sendLogToGrafana(event) {
//   const body = JSON.stringify(event);
//   fetch(`${config.url}`, {
//     method: 'post',
//     body: body,
//     headers: {
//       'Content-Type': 'application/json',
//       Authorization: `Bearer ${config.accountId}:${config.apiKey}`,
//     },
//   }).then((res) => {
//     if (!res.ok) console.log('Failed to send log to Grafana');
//   });
// }

