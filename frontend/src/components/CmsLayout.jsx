import PowerBIReport from './PowerBIReport';

export default function CmsLayout() {

  return (
    <div className="cms-container">
      <header className="cms-header">
        <div className="header-brand">
          <div className="logo">ERP</div>
          <h1>CMS Dashboard</h1>
        </div>
      </header>

      <div className="cms-body">
        <main className="cms-main">
          <div className="page-header">
            <h2>Data Analytics</h2>
            <p>PowerBI visualization dashboard</p>
          </div>
          <PowerBIReport />

        </main>
      </div>
    </div>
  );
}