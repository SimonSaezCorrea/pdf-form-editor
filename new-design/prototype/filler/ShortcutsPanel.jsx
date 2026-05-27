/* ─── ShortcutsPanel.jsx ────────────────────────────────────────────
   Floating panel of keyboard shortcuts. Toggled by FAB in the corner.
   ─────────────────────────────────────────────────────────────────── */

const SHORTCUTS = [
  { title: 'Modos', items: [
    { keys: ['S'], desc: 'Modo Seleccionar' },
    { keys: ['I'], desc: 'Modo Insertar' },
    { keys: ['M'], desc: 'Modo Mover' },
    { keys: ['Esc'], desc: 'Volver a Seleccionar' },
  ]},
  { title: 'Selección', items: [
    { keys: ['Ctrl', 'A'], desc: 'Seleccionar todos' },
    { keys: ['Shift', 'Clic'], desc: 'Agregar/quitar de selección' },
    { keys: ['Esc'], desc: 'Deseleccionar todo' },
  ]},
  { title: 'Campos', items: [
    { keys: ['Ctrl', 'D'], desc: 'Duplicar campo seleccionado' },
    { keys: ['Ctrl', 'C'], desc: 'Copiar campo(s)' },
    { keys: ['Ctrl', 'V'], desc: 'Pegar campo(s)' },
    { keys: ['Del'], desc: 'Eliminar campo(s) seleccionados' },
  ]},
  { title: 'Navegación', items: [
    { keys: ['←'], desc: 'Página anterior' },
    { keys: ['→'], desc: 'Página siguiente' },
  ]},
];

const ShortcutsPanel = ({ visible, onClose }) => {
  if (!visible) return null;
  return (
    <div className="shortcuts-panel">
      <div className="shortcuts-panel__hdr">
        <span>Atajos de teclado</span>
        <IconButton size="sm" label="Cerrar" onClick={onClose}
                    icon={<Icon name="x" size={12} />}
                    style={{ color: 'var(--color-neutral-400)' }} />
      </div>
      <div className="shortcuts-panel__body">
        {SHORTCUTS.map(g => (
          <div key={g.title}>
            <h4 className="shortcuts-group__title">{g.title}</h4>
            {g.items.map(s => (
              <div key={s.desc} className="shortcut-row">
                <span className="shortcut-desc">{s.desc}</span>
                <span className="shortcut-keys">
                  {s.keys.map((k, i) => (
                    <React.Fragment key={i}>
                      <Kbd>{k}</Kbd>
                      {i < s.keys.length - 1 && <span className="kbd-sep">+</span>}
                    </React.Fragment>
                  ))}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

window.ShortcutsPanel = ShortcutsPanel;
