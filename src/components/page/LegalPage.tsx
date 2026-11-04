import { Container } from './PageParts';

export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  points?: string[];
}

export function LegalPage({ title, updated, intro, sections }: { title: string; updated: string; intro: string; sections: LegalSection[] }) {
  return (
    <section style={{ background: '#F5F6FA', paddingTop: '160px', paddingBottom: '96px' }}>
      <Container width={900}>
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E4EA', borderRadius: '16px', padding: 'clamp(28px, 5vw, 56px)' }}>
          <h1 className="font-heading font-800 text-navy" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', lineHeight: 1.15, marginBottom: '8px' }}>{title}</h1>
          <p className="font-body" style={{ color: '#5A6376', fontSize: '14px', marginBottom: '28px' }}>Last updated: {updated}</p>
          <p className="font-body" style={{ color: '#3F4759', fontSize: '16px', lineHeight: 1.75, marginBottom: '32px' }}>{intro}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {sections.map((s) => (
              <div key={s.heading}>
                <h2 className="font-heading font-bold text-navy" style={{ fontSize: '19px', marginBottom: '10px' }}>{s.heading}</h2>
                {(s.paragraphs ?? []).map((p) => (
                  <p key={p} className="font-body" style={{ color: '#3F4759', fontSize: '15.5px', lineHeight: 1.75, marginBottom: '10px' }}>{p}</p>
                ))}
                {s.points && (
                  <ul style={{ paddingLeft: '22px', listStyle: 'disc', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {s.points.map((pt) => (
                      <li key={pt} className="font-body" style={{ color: '#3F4759', fontSize: '15.5px', lineHeight: 1.65 }}>{pt}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

export const LEGAL_UPDATED = 'October 29, 2026';
