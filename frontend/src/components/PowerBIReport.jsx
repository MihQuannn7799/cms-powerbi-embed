import { useEffect, useState } from 'react';
import { PowerBIEmbed } from 'powerbi-client-react';
import { models } from 'powerbi-client';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function PowerBIReport() {
  const [embedInfo, setEmbedInfo] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchEmbedInfo = () => {
    setLoading(true);
    setError(null);

    fetch(`${API_BASE}/api/powerbi/embed-info`)
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        return res.json();
      })
      .then((data) => {
        setEmbedInfo(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Không tải được dashboard');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchEmbedInfo();
  }, []);

  if (loading) {
    return (
      <div className="powerbi-container">
        <div className="powerbi-placeholder">
          <div className="placeholder-icon">📊</div>
          <h3>Đang tải dashboard...</h3>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="powerbi-container">
        <div className="powerbi-placeholder">
          <div className="placeholder-icon"></div>
          <h3>Không thể tải dashboard</h3>
          <p>{error}</p>
          <button onClick={fetchEmbedInfo}>Thử lại</button>
        </div>
      </div>
    );
  }

  return (
    <div className="powerbi-container">
      <div className="powerbi-report-wrapper">
        <PowerBIEmbed
          embedConfig={{
            type: 'report',
            id: embedInfo.reportId,
            embedUrl: embedInfo.embedUrl,
            accessToken: embedInfo.embedToken,
            tokenType: models.TokenType.Embed,
            settings: {
              panes: {
                filters: { visible: false },
                pageNavigation: { visible: true },
              },
              background: models.BackgroundType.Transparent,
            },
          }}
          eventHandlers={
            new Map([
              [
                'error',
                (event) => {
                  console.error('PowerBI embed error:', event.detail);
                  setError('Report bị lỗi khi hiển thị, thử tải lại trang.');
                },
              ],
            ])
          }
          cssClassName="powerbi-report"
        />
      </div>
    </div>
  );
}
