import { Controller, Get } from '@nestjs/common';
import { PowerBiService, EmbedInfo } from './powerbi.service';

@Controller('powerbi')
export class PowerBiController {
  constructor(private readonly powerBiService: PowerBiService) {}

  // Frontend (PowerBIReport.jsx) gọi GET /powerbi/embed-info
  @Get('embed-info')
  async getEmbedInfo(): Promise<EmbedInfo> {
    return this.powerBiService.getEmbedInfo();
  }
}