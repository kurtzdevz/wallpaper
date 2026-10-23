import { loadConfig } from './config.ts';
import { createApp } from './http/app.ts';

const cfg = loadConfig();
const app = createApp(cfg);

app.listen(cfg.port, () => {
  // eslint-disable-next-line no-console
  console.log(`API /api/v1 no ar em http://localhost:${cfg.port}`);
});
