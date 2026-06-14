/* ─── MockPdfPage.jsx ───────────────────────────────────────────────
   Realistic-looking PDF page (rendered as HTML) used as the canvas
   background. Both Editor & Filler stack DraggableField/FillerText
   absolutely-positioned children over this.
   ────────────────────────────────────────────────────────────────── */

const MockPdfPage = ({ children, zoom = 1 }) => (
  <div
    className="pdf-page-stage"
    style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
  >
    <div className="mock-pdf">
      <h1>Contrato de Arriendo Residencial</h1>
      <p>
        En la ciudad de Santiago, a la fecha indicada al pie de este documento,
        entre las partes a continuación individualizadas, se ha convenido el
        siguiente contrato de arriendo de inmueble urbano:
      </p>

      <div className="label">1. Arrendador</div>
      <div className="grid">
        <div>
          <div className="label" style={{marginTop: 0}}>Nombre completo</div>
          <div className="underline"></div>
        </div>
        <div>
          <div className="label" style={{marginTop: 0}}>R.U.T.</div>
          <div className="underline"></div>
        </div>
      </div>

      <div className="label">2. Arrendatario</div>
      <div className="grid">
        <div>
          <div className="label" style={{marginTop: 0}}>Nombre completo</div>
          <div className="underline"></div>
        </div>
        <div>
          <div className="label" style={{marginTop: 0}}>Correo electrónico</div>
          <div className="underline"></div>
        </div>
        <div>
          <div className="label" style={{marginTop: 0}}>Teléfono</div>
          <div className="underline"></div>
        </div>
        <div>
          <div className="label" style={{marginTop: 0}}>Dirección actual</div>
          <div className="underline"></div>
        </div>
      </div>

      <div className="label">3. Objeto del contrato</div>
      <p>
        El arrendador da en arriendo al arrendatario el inmueble ubicado en la
        dirección detallada a continuación, para uso exclusivo habitacional, con
        las condiciones acordadas por las partes:
      </p>
      <div className="underline"></div>

      <div className="label">4. Renta mensual</div>
      <div className="grid">
        <div>
          <div className="label" style={{marginTop: 0}}>Monto (CLP)</div>
          <div className="underline"></div>
        </div>
        <div>
          <div className="label" style={{marginTop: 0}}>Día de pago</div>
          <div className="underline"></div>
        </div>
      </div>

      <div className="footer">
        <span>Contrato modelo · Página 1 de 2</span>
        <span>v1.4</span>
      </div>
    </div>
    {children}
  </div>
);

window.MockPdfPage = MockPdfPage;
