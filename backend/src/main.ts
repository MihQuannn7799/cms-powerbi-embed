import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  const frontendUrl = process.env.FRONTEND_URL || '*';

  app.enableCors({
    origin: frontendUrl === '*' ? true : frontendUrl.split(','),
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  });

  app.useGlobalFilters(new HttpExceptionFilter());

  const port = process.env.PORT || 3002;
  await app.listen(port);
  console.log(`Backend running on http://localhost:${port}`);
}
bootstrap();
