/* eslint-disable no-console -- Điểm khởi động là nơi duy nhất được in ra terminal */
import { buildServer, GATEWAY_PISTON_URL, GATEWAY_PORT } from './server';

const app = await buildServer();
await app.listen({ port: GATEWAY_PORT, host: '127.0.0.1' });
console.log(
  `Gateway chạy ở http://127.0.0.1:${String(GATEWAY_PORT)} · Piston: ${GATEWAY_PISTON_URL}`,
);
