import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { TemplatePanel } from '@/features/templates/components/TemplatePanel/TemplatePanel';
import type { Template } from '@/features/templates/hooks/useTemplateStore';
import type { FormField } from '@/types/shared';

const baseField: FormField = {
  id: 'field-1',
  name: 'campo1',
  page: 1,
  x: 10,
  y: 20,
  width: 100,
  height: 20,
  fontSize: 12,
  fontFamily: 'Helvetica',
};

const template1: Template = {
  id: 'template-1',
  name: 'Plantilla A',
  createdAt: '2026-03-27T00:00:00.000Z',
  fields: [baseField],
};

const defaultProps = {
  templates: [] as Template[],
  saveTemplate: vi.fn(),
  overwriteTemplate: vi.fn(),
  renameTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
  storageError: null,
  fields: [] as FormField[],
  loadTemplateFields: vi.fn(),
};

describe('TemplatePanel', () => {
  it('(1) save button is disabled when input is empty', () => {
    const { getByRole } = render(<TemplatePanel {...defaultProps} />);
    const saveBtn = getByRole('button', { name: 'Guardar' });
    expect(saveBtn).toBeDisabled();
  });

  it('(2) save button is disabled when name is longer than 100 chars', () => {
    const { getByRole, getByPlaceholderText } = render(<TemplatePanel {...defaultProps} />);
    const input = getByPlaceholderText('Nombre de plantilla');
    fireEvent.change(input, { target: { value: 'a'.repeat(101) } });
    const saveBtn = getByRole('button', { name: 'Guardar' });
    expect(saveBtn.hasAttribute('disabled') || input.getAttribute('maxlength') === '100').toBe(true);
  });

  it('(3) overwrite confirmation shown when name matches existing template', () => {
    const { getByRole, getByPlaceholderText, getByText } = render(
      <TemplatePanel {...defaultProps} templates={[template1]} />,
    );
    const input = getByPlaceholderText('Nombre de plantilla');
    fireEvent.change(input, { target: { value: 'Plantilla A' } });
    const saveBtn = getByRole('button', { name: 'Guardar' });
    fireEvent.click(saveBtn);
    expect(getByText('Una plantilla con este nombre ya existe. ¿Sobreescribir?')).toBeTruthy();
  });

  it('(4) Cancelar in overwrite confirmation keeps original template', () => {
    const overwriteTemplate = vi.fn();
    const { getByRole, getByPlaceholderText, getByText, queryByText } = render(
      <TemplatePanel {...defaultProps} templates={[template1]} overwriteTemplate={overwriteTemplate} />,
    );
    fireEvent.change(getByPlaceholderText('Nombre de plantilla'), {
      target: { value: 'Plantilla A' },
    });
    fireEvent.click(getByRole('button', { name: 'Guardar' }));
    fireEvent.click(getByText('Cancelar'));
    expect(overwriteTemplate).not.toHaveBeenCalled();
    expect(queryByText('Una plantilla con este nombre ya existe. ¿Sobreescribir?')).toBeNull();
  });

  it('(5) Sí in overwrite confirmation calls overwriteTemplate', () => {
    const overwriteTemplate = vi.fn();
    const { getByRole, getByPlaceholderText, getByText } = render(
      <TemplatePanel {...defaultProps} templates={[template1]} overwriteTemplate={overwriteTemplate} />,
    );
    fireEvent.change(getByPlaceholderText('Nombre de plantilla'), {
      target: { value: 'Plantilla A' },
    });
    fireEvent.click(getByRole('button', { name: 'Guardar' }));
    fireEvent.click(getByText('Sí'));
    expect(overwriteTemplate).toHaveBeenCalledWith(template1.id, expect.any(Array));
  });

  it('(6) Cargar calls loadTemplateFields with template fields and replace', () => {
    const loadTemplateFields = vi.fn();
    const { getAllByRole } = render(
      <TemplatePanel {...defaultProps} templates={[template1]} loadTemplateFields={loadTemplateFields} />,
    );
    const loadBtn = getAllByRole('button', { name: 'Cargar' })[0];
    fireEvent.click(loadBtn);
    expect(loadTemplateFields).toHaveBeenCalledWith(template1.fields, 'replace');
  });

  it('(7) Renombrar switches to inline edit; Enter confirms, Escape cancels', () => {
    const renameTemplate = vi.fn();
    const { getAllByRole, getByDisplayValue, queryByDisplayValue } = render(
      <TemplatePanel {...defaultProps} templates={[template1]} renameTemplate={renameTemplate} />,
    );
    fireEvent.click(getAllByRole('button', { name: 'Renombrar' })[0]);
    const renameInput = getByDisplayValue('Plantilla A');
    expect(renameInput).toBeTruthy();

    fireEvent.keyDown(renameInput, { key: 'Escape' });
    expect(queryByDisplayValue('Plantilla A')).toBeNull();
    expect(renameTemplate).not.toHaveBeenCalled();

    fireEvent.click(getAllByRole('button', { name: 'Renombrar' })[0]);
    const renameInput2 = getByDisplayValue('Plantilla A');
    fireEvent.change(renameInput2, { target: { value: 'Nueva Nombre' } });
    fireEvent.keyDown(renameInput2, { key: 'Enter' });
    expect(renameTemplate).toHaveBeenCalledWith(template1.id, 'Nueva Nombre');
  });

  it('(8) Eliminar shows confirmation; Sí removes item', () => {
    const deleteTemplate = vi.fn();
    const { getAllByRole, getByText } = render(
      <TemplatePanel {...defaultProps} templates={[template1]} deleteTemplate={deleteTemplate} />,
    );
    fireEvent.click(getAllByRole('button', { name: 'Eliminar' })[0]);
    expect(getByText('¿Eliminar esta plantilla?')).toBeTruthy();
    const siButtons = getAllByRole('button', { name: 'Sí' });
    fireEvent.click(siButtons[siButtons.length - 1]);
    expect(deleteTemplate).toHaveBeenCalledWith(template1.id);
  });

  it('(9) storageError banner renders when storageError is non-null', () => {
    const { getByText } = render(
      <TemplatePanel {...defaultProps} storageError="No se pudo guardar: almacenamiento lleno." />,
    );
    expect(getByText('No se pudo guardar: almacenamiento lleno.')).toBeTruthy();
  });

  it('(10) import error message shown for invalid JSON text input', () => {
    const { getByPlaceholderText, getByRole, getByText } = render(
      <TemplatePanel {...defaultProps} />,
    );
    const textarea = getByPlaceholderText('Pegar JSON aquí...');
    fireEvent.change(textarea, { target: { value: '{invalid json' } });
    fireEvent.click(getByRole('button', { name: 'Importar texto' }));
    expect(getByText(/Error de sintaxis JSON/)).toBeTruthy();
  });
});
