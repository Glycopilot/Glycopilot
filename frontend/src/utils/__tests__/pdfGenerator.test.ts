import { generateMedicalReportHTML } from '../pdfGenerator';

describe('generateMedicalReportHTML', () => {
  it('generates a valid HTML report', () => {
    const html = generateMedicalReportHTML({
      period: 'Semaine du 1 au 7',
      measurements: [
        {
          id: '1',
          value: 110,
          time: '08:00',
          context: 'À jeun',
          source: 'manual',
          date: '01/01/2025',
          measuredAt: new Date('2025-01-01T08:00:00Z'),
        },
      ],
      stats: {
        average: 110,
        min: 90,
        max: 140,
        timeInRange: 80,
        stability: 'Bon',
        variability: 30,
      },
      patientName: 'Test User',
      patientEmail: 'test@example.com',
    });

    expect(typeof html).toBe('string');
    expect(html).toContain('Rapport de Suivi Glycémique');
    expect(html).toContain('Test User');
    expect(html).toContain('110 mg/dL');
  });
});

