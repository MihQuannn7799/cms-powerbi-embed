import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PowerBiModule } from './powerbi/powerbi.module';
import { SupabaseModule } from './supabase/supabase.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    SupabaseModule,
    PowerBiModule,
  ],
})
export class AppModule {}
