import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import axios from 'axios';

interface CachedToken {
  accessToken: string;
  expiresAt: number; // epoch ms
}

export interface EmbedInfo {
  embedUrl: string;
  embedToken: string;
  reportId: string;
  expiresAt: string; // ISO string - để frontend biết khi nào cần refresh
}

@Injectable()
export class PowerBiService {
  private readonly logger = new Logger(PowerBiService.name);
  private cachedToken: CachedToken | null = null;

  private get tenantId() {
    return process.env.AZURE_TENANT_ID;
  }
  private get clientId() {
    return process.env.AZURE_CLIENT_ID;
  }
  private get pbiUsername() {
    return process.env.PBI_USERNAME;
  }
  private get pbiPassword() {
    return process.env.PBI_PASSWORD;
  }
  private get workspaceId() {
    return process.env.PBI_WORKSPACE_ID;
  }
  private get reportId() {
    return process.env.PBI_REPORT_ID;
  }

  /**
   * Lấy Azure AD access token bằng ROPC flow (master user).
   * Cache lại trong RAM, chỉ xin token mới khi gần hết hạn.
   */
  private async getAccessToken(): Promise<string> {
    const now = Date.now();

    if (this.cachedToken && this.cachedToken.expiresAt - now > 60_000) {
      return this.cachedToken.accessToken;
    }

    if (
      !this.tenantId ||
      !this.clientId ||
      !this.pbiUsername ||
      !this.pbiPassword
    ) {
      throw new InternalServerErrorException(
        'Thiếu cấu hình Azure AD trong .env (AZURE_TENANT_ID, AZURE_CLIENT_ID, PBI_USERNAME, PBI_PASSWORD)',
      );
    }

    const url = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;
    const params = new URLSearchParams({
      grant_type: 'password',
      client_id: this.clientId,
      username: this.pbiUsername,
      password: this.pbiPassword,
      scope: 'https://analysis.windows.net/powerbi/api/.default',
    });

    try {
      const res = await axios.post(url, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const { access_token, expires_in } = res.data;

      this.cachedToken = {
        accessToken: access_token,
        expiresAt: now + expires_in * 1000,
      };

      return access_token;
    } catch (err: any) {
      const azureError = err?.response?.data;
      // In full error để đọc đúng mã AADSTS thật (xem console log)
      this.logger.error(
        'Azure AD token error: ' + JSON.stringify(azureError, null, 2),
      );

      const errorCode = azureError?.error;
      const errorDesc: string = azureError?.error_description || '';

      if (errorDesc.includes('AADSTS50076') || errorDesc.includes('AADSTS50079')) {
        throw new InternalServerErrorException(
          'Tài khoản đang bật MFA - ROPC không hỗ trợ MFA. Cần tắt MFA cho tài khoản này hoặc đổi sang Authorization Code flow.',
        );
      }
      if (errorDesc.includes('AADSTS65001')) {
        throw new InternalServerErrorException(
          'Chưa được cấp quyền (consent) cho app - cần admin trường bấm Grant consent, hoặc tenant chặn user tự consent.',
        );
      }
      if (errorDesc.includes('AADSTS7000218')) {
        throw new InternalServerErrorException(
          'App chưa bật "Allow public client flows" - vào Azure Portal > App > Authentication > bật Yes.',
        );
      }
      if (errorDesc.includes('AADSTS50034') || errorDesc.includes('AADSTS50126')) {
        throw new InternalServerErrorException(
          'Sai username hoặc password - kiểm tra lại PBI_USERNAME/PBI_PASSWORD trong .env.',
        );
      }
      if (errorDesc.includes('AADSTS90002')) {
        throw new InternalServerErrorException(
          'AZURE_TENANT_ID sai hoặc không tồn tại - kiểm tra lại giá trị trong .env.',
        );
      }

      throw new InternalServerErrorException(
        `Không lấy được access token từ Azure AD: ${errorCode || 'unknown'} - ${errorDesc || 'xem log server để biết chi tiết'}`,
      );
    }
  }

  /**
   * Lấy embedUrl + generate embed token cho report.
   * Đây là endpoint chính frontend gọi để nhúng dashboard.
   */
  async getEmbedInfo(): Promise<EmbedInfo> {
    if (!this.workspaceId || !this.reportId) {
      throw new InternalServerErrorException(
        'Thiếu PBI_WORKSPACE_ID hoặc PBI_REPORT_ID trong .env',
      );
    }

    const accessToken = await this.getAccessToken();
    const headers = { Authorization: `Bearer ${accessToken}` };

    try {
      // 1. Lấy report metadata (embedUrl)
      const reportRes = await axios.get(
        `https://api.powerbi.com/v1.0/myorg/groups/${this.workspaceId}/reports/${this.reportId}`,
        { headers },
      );

      // 2. Generate embed token (view-only)
      const tokenRes = await axios.post(
        `https://api.powerbi.com/v1.0/myorg/groups/${this.workspaceId}/reports/${this.reportId}/GenerateToken`,
        { accessLevel: 'View' },
        { headers },
      );

      const expiresAt =
        tokenRes.data.expiration ||
        new Date(Date.now() + 55 * 60 * 1000).toISOString();

      return {
        embedUrl: reportRes.data.embedUrl,
        embedToken: tokenRes.data.token,
        reportId: reportRes.data.id,
        expiresAt,
      };
    } catch (err: any) {
      this.logger.error(
        'Power BI API error',
        JSON.stringify(err?.response?.data || err.message),
      );
      throw new InternalServerErrorException(
        'Không lấy được thông tin embed từ Power BI - kiểm tra workspace/report ID và quyền truy cập.',
      );
    }
  }
}