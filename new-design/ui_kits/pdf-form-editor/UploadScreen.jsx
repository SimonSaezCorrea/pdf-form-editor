/* ─── UploadScreen.jsx ─────────────────────────────────────────────
   Empty-state dropzone for both editor & filler entry. Click anywhere
   to "load" the bundled sample PDF.
   ────────────────────────────────────────────────────────────────── */

const UploadScreen = ({ variant, onLoadSample }) => {
  const isEditor = variant === 'editor';
  return (
    <div className="upload-area">
      <label className="uploader" onClick={onLoadSample}>
        <Icon name="document" size={48} className="uploader__icon" />
        <h2>{isEditor ? 'PDF Form Editor' : 'Rellenar PDF'}</h2>
        <p>
          {isEditor
            ? 'Importa un PDF y añade campos de formulario interactivos.'
            : 'Sube un PDF con campos AcroForm para rellenarlos de forma interactiva.'}
        </p>
        <span className="uploader__hint">Haz clic para cargar un PDF de muestra</span>
      </label>
    </div>
  );
};

window.UploadScreen = UploadScreen;
