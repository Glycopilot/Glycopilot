import { GLYCEMIA_TARGET } from '../constants/glycemia.constants';

interface GlucoseMeasurement {
  id: string;
  value: number;
  time: string;
  context: string;
  source: 'manual' | 'cgm';
  date: string;
  measuredAt: Date;
}

interface GlucoseStats {
  average: number;
  min: number;
  max: number;
  timeInRange: number;
  stability: 'Bon' | 'Moyen' | 'Faible';
  variability: number;
}

interface PdfReportData {
  period: string;
  measurements: GlucoseMeasurement[];
  stats: GlucoseStats;
  selectedDate?: Date;
  customDateMode?: boolean;
  patientName?: string;
  patientEmail?: string;
}

const getStatusColor = (value: number): string => {
  if (value < GLYCEMIA_TARGET.MIN) return '#EF4444';
  if (value > GLYCEMIA_TARGET.MAX) return '#F59E0B';
  return '#10B981';
};

const getStatusLabel = (value: number): string => {
  if (value < GLYCEMIA_TARGET.MIN) return 'Bas';
  if (value > GLYCEMIA_TARGET.MAX) return 'Haut';
  return 'Normal';
};

const getStabilityColor = (stability: string): string => {
  if (stability === 'Bon') return '#10B981';
  if (stability === 'Moyen') return '#F59E0B';
  return '#EF4444';
};

// Cette fonction génère un template HTML complet pour le PDF médical
// La complexité apparente est due au contenu HTML/CSS inline requis par expo-print
// NOSONAR: cognitive-complexity - Template HTML statique
export const generateMedicalReportHTML = (data: PdfReportData): string => {
  const {
    period,
    measurements,
    stats,
    selectedDate,
    customDateMode,
    patientName,
    patientEmail,
  } = data;

  const reportDate = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const periodText =
    customDateMode && selectedDate
      ? selectedDate.toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : period;

  // Calculer les statistiques supplémentaires
  const hypoglycemiaCount = measurements.filter(
    m => m.value < GLYCEMIA_TARGET.MIN
  ).length;
  const hyperglycemiaCount = measurements.filter(
    m => m.value > GLYCEMIA_TARGET.MAX
  ).length;
  const normalCount = measurements.filter(
    m => m.value >= GLYCEMIA_TARGET.MIN && m.value <= GLYCEMIA_TARGET.MAX
  ).length;

  const hypoglycemiaPercent =
    measurements.length > 0
      ? Math.round((hypoglycemiaCount / measurements.length) * 100)
      : 0;
  const hyperglycemiaPercent =
    measurements.length > 0
      ? Math.round((hyperglycemiaCount / measurements.length) * 100)
      : 0;

  // Générer les lignes du tableau
  const tableRows = measurements
    .map(
      m => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #E5E7EB;">${m.date}</td>
        <td style="padding: 12px; border-bottom: 1px solid #E5E7EB;">${m.time}</td>
        <td style="padding: 12px; border-bottom: 1px solid #E5E7EB; font-weight: 700; color: ${getStatusColor(m.value)};">
          ${m.value} mg/dL
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #E5E7EB;">${m.context}</td>
        <td style="padding: 12px; border-bottom: 1px solid #E5E7EB;">
          <span style="background-color: ${m.source === 'manual' ? '#F3E8FF' : '#E0F2FE'}; 
                       color: ${m.source === 'manual' ? '#7C3AED' : '#0284C7'}; 
                       padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 600;">
            ${m.source === 'manual' ? 'Manuel' : 'CGM'}
          </span>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #E5E7EB;">
          <span style="background-color: ${getStatusColor(m.value)}20; 
                       color: ${getStatusColor(m.value)}; 
                       padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 600;">
            ${getStatusLabel(m.value)}
          </span>
        </td>
      </tr>
    `
    )
    .join('');

  const patientInitial = patientName ? patientName.charAt(0).toUpperCase() : 'P';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Helvetica Neue', Arial, sans-serif;
          color: #1F2937;
          padding: 40px;
          background-color: #FFFFFF;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 3px solid #007AFF;
        }
        
        .logo-section {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        
        
        .app-name {
          font-size: 32px;
          font-weight: 800;
          color: #007AFF;
          letter-spacing: -0.5px;
        }
        
        .report-info {
          text-align: right;
        }
        
        .report-type {
          font-size: 16px;
          font-weight: 700;
          color: #1F2937;
          margin-bottom: 4px;
        }
        
        .report-date {
          font-size: 13px;
          color: #6B7280;
        }
        
        .title {
          font-size: 28px;
          font-weight: 800;
          color: #1F2937;
          margin-bottom: 8px;
        }
        
        .subtitle {
          font-size: 16px;
          color: #6B7280;
          margin-bottom: 32px;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-bottom: 32px;
        }
        
        .stat-card {
          background: linear-gradient(135deg, #F9FAFB 0%, #FFFFFF 100%);
          border: 2px solid #E5E7EB;
          border-radius: 16px;
          padding: 20px;
          text-align: center;
        }
        
        .stat-label {
          font-size: 13px;
          font-weight: 600;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }
        
        .stat-value {
          font-size: 36px;
          font-weight: 800;
          color: #1F2937;
          margin-bottom: 4px;
        }
        
        .stat-unit {
          font-size: 12px;
          color: #818181;
        }
        
        .section {
          margin-bottom: 32px;
        }
        
        .section-title {
          font-size: 20px;
          font-weight: 700;
          color: #1F2937;
          margin-bottom: 16px;
          padding-bottom: 8px;
          border-bottom: 2px solid #E5E7EB;
        }
        
        .analysis-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        
        .analysis-card {
          background-color: #F9FAFB;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 16px;
        }
        
        .analysis-label {
          font-size: 13px;
          font-weight: 600;
          color: #6B7280;
          margin-bottom: 8px;
        }
        
        .analysis-value {
          font-size: 20px;
          font-weight: 700;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          background-color: #FFFFFF;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          overflow: hidden;
        }
        
        thead {
          background-color: #F9FAFB;
        }
        
        th {
          padding: 16px 12px;
          text-align: left;
          font-size: 13px;
          font-weight: 700;
          color: #374151;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 2px solid #E5E7EB;
        }
        
        td {
          font-size: 14px;
          color: #1F2937;
        }
        
        .footer {
          margin-top: 40px;
          padding-top: 24px;
          border-top: 2px solid #E5E7EB;
        }
        
        .recommendations {
          background-color: #EBF5FF;
          border-left: 4px solid #007AFF;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 24px;
        }
        
        .recommendations-title {
          font-size: 16px;
          font-weight: 700;
          color: #007AFF;
          margin-bottom: 12px;
        }
        
        .recommendation-item {
          font-size: 14px;
          color: #1F2937;
          line-height: 1.6;
          margin-bottom: 8px;
          padding-left: 20px;
          position: relative;
        }
        
        .recommendation-item:before {
          content: "•";
          position: absolute;
          left: 0;
          color: #007AFF;
          font-weight: 700;
        }
        
        .footer-note {
          font-size: 12px;
          color: #6B7280;
          text-align: center;
          font-style: italic;
        }
        
        @media print {
          body {
            padding: 20px;
          }
        }
      </style>
    </head>
    <body>
      <!-- En-tête -->
      <div class="header">
        <div class="logo-section">
          <div class="app-name">Glycopilot</div>
        </div>
        <div class="report-info">
          <div class="report-type">Rapport Médical</div>
          <div class="report-date">${reportDate}</div>
        </div>
      </div>
      
      <!-- Titre -->
      <h1 class="title">Rapport de Suivi Glycémique</h1>
      <p class="subtitle">Période : ${periodText} • ${measurements.length} mesure${measurements.length > 1 ? 's' : ''}</p>
      
      <!-- Informations Patient -->
      ${
        patientName || patientEmail
          ? `
      <div class="section" style="margin-bottom: 24px;">
        <div style="background-color: #F9FAFB; border: 2px solid #E5E7EB; border-radius: 12px; padding: 20px;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
            <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #007AFF 0%, #0051D5 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 18px; font-weight: 700;">
              ${patientInitial}
            </div>
            <div>
              <div style="font-size: 14px; font-weight: 600; color: #6B7280; margin-bottom: 4px;">Patient</div>
              ${patientName && `<div style="font-size: 18px; font-weight: 700; color: #1F2937; margin-bottom: 2px;">${patientName}</div>`}
              ${patientEmail && `<div style="font-size: 14px; color: #6B7280;">${patientEmail}</div>`}
            </div>
          </div>
        </div>
      </div>
      `
          : ''
      }
      
      <!-- Statistiques principales -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Glycémie Moyenne</div>
          <div class="stat-value" style="color: ${getStatusColor(stats.average)};">${stats.average}</div>
          <div class="stat-unit">mg/dL</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-label">Temps dans la cible</div>
          <div class="stat-value" style="color: ${stats.timeInRange >= 70 ? '#10B981' : '#F59E0B'};">${stats.timeInRange}%</div>
          <div class="stat-unit">${GLYCEMIA_TARGET.MIN}-${GLYCEMIA_TARGET.MAX} mg/dL</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-label">Stabilité Glycémique</div>
          <div class="stat-value" style="color: ${getStabilityColor(stats.stability)};">${stats.stability}</div>
          <div class="stat-unit">Écart-type: ${stats.variability} mg/dL</div>
        </div>
      </div>
      
      <!-- Analyse détaillée -->
      <div class="section">
        <h2 class="section-title">Analyse Détaillée</h2>
        
        <div class="analysis-grid">
          <div class="analysis-card">
            <div class="analysis-label">Valeur Minimale</div>
            <div class="analysis-value" style="color: #EF4444;">${stats.min} mg/dL</div>
          </div>
          
          <div class="analysis-card">
            <div class="analysis-label">Valeur Maximale</div>
            <div class="analysis-value" style="color: #F59E0B;">${stats.max} mg/dL</div>
          </div>
          
          <div class="analysis-card">
            <div class="analysis-label">Hypoglycémies (&lt; ${GLYCEMIA_TARGET.MIN})</div>
            <div class="analysis-value" style="color: #EF4444;">${hypoglycemiaCount} (${hypoglycemiaPercent}%)</div>
          </div>
          
          <div class="analysis-card">
            <div class="analysis-label">Hyperglycémies (&gt; ${GLYCEMIA_TARGET.MAX})</div>
            <div class="analysis-value" style="color: #F59E0B;">${hyperglycemiaCount} (${hyperglycemiaPercent}%)</div>
          </div>
          
          <div class="analysis-card">
            <div class="analysis-label">Valeurs Normales</div>
            <div class="analysis-value" style="color: #10B981;">${normalCount} (${stats.timeInRange}%)</div>
          </div>
          
          <div class="analysis-card">
            <div class="analysis-label">Variabilité (CV)</div>
            <div class="analysis-value" style="color: ${stats.variability <= 36 ? '#10B981' : '#F59E0B'};">${stats.variability} mg/dL</div>
          </div>
        </div>
      </div>
      <br />
      <!-- Tableau des mesures -->
      <div class="section">
        <h2 class="section-title">Historique des Mesures</h2>
        
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Heure</th>
              <th>Glycémie</th>
              <th>Contexte</th>
              <th>Source</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
      
      <!-- Recommandations -->
      <div class="footer">
        <div class="recommendations">
          <div class="recommendations-title">Notes Cliniques</div>
          <div class="recommendation-item">
            Temps dans la cible (TIR) : L'objectif recommandé est ≥ 70% dans la plage ${GLYCEMIA_TARGET.MIN}-${GLYCEMIA_TARGET.MAX} mg/dL
          </div>
          <div class="recommendation-item">
            Variabilité glycémique : Un coefficient de variation (CV) ≤ 36 mg/dL indique une bonne stabilité
          </div>
          <div class="recommendation-item">
            Hypoglycémies : Un objectif de &lt; 4% du temps sous ${GLYCEMIA_TARGET.MIN} mg/dL est recommandé
          </div>
          <div class="recommendation-item">
            Hyperglycémies : Limiter le temps au-dessus de ${GLYCEMIA_TARGET.MAX} mg/dL pour réduire les complications
          </div>
        </div>
        
        <p class="footer-note">
          Ce rapport a été généré automatiquement par Glycopilot. 
          Il constitue un outil d'aide à la décision médicale et doit être interprété par un professionnel de santé qualifié.
        </p>
      </div>
    </body>
    </html>
  `;
};
