import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  // rawBody: a assinatura dos avisos da Meta (webhook do Instagram) é conferida sobre o corpo original
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.setGlobalPrefix('api');
  // Atrás do proxy da Vercel: o IP real vem do X-Forwarded-For (limite de tentativas por IP)
  if (process.env.VERCEL) {
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
  }
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    // Cookie do refresh token (quando o frontend chama a API direto, sem o proxy do Vite)
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Documentação (Swagger) só fora da Vercel: em produção não expõe o mapa da API, e a interface
  // dela depende de arquivos do node_modules que não vão para o bundle da função
  if (!process.env.VERCEL) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('LeadNexi API')
      .setDescription(
        'API do CRM LeadNexi: leads, pipelines e etapas do Kanban',
      )
      .setVersion('0.0.1')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, () =>
      SwaggerModule.createDocument(app, swaggerConfig),
    );
  }

  await app.listen(process.env.PORT ?? 3000);
}
// Sem await no nível do módulo: na Vercel o listen é interceptado e o módulo precisa terminar de carregar
void bootstrap();
