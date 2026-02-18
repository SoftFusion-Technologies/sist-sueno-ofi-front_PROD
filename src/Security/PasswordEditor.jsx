import { useState, useMemo, useEffect } from 'react';

export default function PasswordEditor({
  value,
  onChange,
  showConfirm = true,
  confirmValue = '',
  onConfirmChange = () => {},
  onValidityChange = () => {}
}) {
  const [show, setShow] = useState(false);

  const score = useMemo(() => {
    if (!value) return 0;
    let s = 0;
    if (value.length >= 8) s++;
    if (/[A-Z]/.test(value)) s++;
    if (/[a-z]/.test(value)) s++;
    if (/\d/.test(value)) s++;
    if (/[^A-Za-z0-9]/.test(value)) s++;
    return Math.min(s, 4);
  }, [value]);

  const genPassword = () => {
    const chars =
      'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%*?';
    let out = '';
    for (let i = 0; i < 12; i++)
      out += chars[Math.floor(Math.random() * chars.length)];
    onChange(out);
    onConfirmChange('');
  };

  const mismatch =
    showConfirm && value && confirmValue && value !== confirmValue;

  useEffect(() => {
    onValidityChange(!mismatch);
  }, [mismatch, onValidityChange]);

  const inputBase =
    'w-full px-4 py-2.5 rounded-lg border pr-36 sm:pr-28 outline-none ' +
    'bg-white text-slate-900 placeholder:text-slate-400 border-black/10 ' +
    'focus:ring-2 focus:ring-indigo-500/30 ' +
    'dark:bg-white/10 dark:text-white dark:placeholder:text-white/30 dark:border-white/10 dark:focus:ring-white/20';

  const inputConfirm =
    'w-full px-4 py-2.5 rounded-lg border outline-none ' +
    'bg-white text-slate-900 placeholder:text-slate-400 border-black/10 ' +
    'focus:ring-2 focus:ring-indigo-500/30 ' +
    'dark:bg-white/10 dark:text-white dark:placeholder:text-white/30 dark:border-white/10 dark:focus:ring-white/20';

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700 dark:text-white/75">
        Contraseña
      </label>

      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Nueva contraseña (dejar vacío para no cambiar)"
          autoComplete="new-password"
          className={inputBase}
        />
        <div className="hidden sm:flex items-center gap-3 absolute inset-y-0 right-2">
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="text-xs font-semibold text-indigo-700 hover:underline dark:text-indigo-200"
          >
            {show ? 'Ocultar' : 'Mostrar'}
          </button>
          <span className="text-slate-300 dark:text-white/25">·</span>
          <button
            type="button"
            onClick={genPassword}
            className="text-xs font-semibold text-slate-600 hover:underline dark:text-white/65"
          >
            Generar
          </button>
        </div>
      </div>

      <div className="flex sm:hidden items-center gap-4 text-xs">
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="font-semibold text-indigo-700 hover:underline dark:text-indigo-200"
        >
          {show ? 'Ocultar' : 'Mostrar'}
        </button>
        <span className="text-slate-300 dark:text-white/25">·</span>
        <button
          type="button"
          onClick={genPassword}
          className="font-semibold text-slate-600 hover:underline dark:text-white/65"
        >
          Generar
        </button>
      </div>

      {/* Fuerza */}
      <div className="h-1 w-full bg-slate-200 rounded dark:bg-white/15">
        <div
          className={`h-1 rounded ${
            [
              'bg-red-500',
              'bg-yellow-500',
              'bg-yellow-500',
              'bg-green-500',
              'bg-green-600'
            ][score]
          }`}
          style={{ width: `${(score / 4) * 100}%` }}
        />
      </div>

      <p className="text-xs text-slate-600 dark:text-white/55">
        Usá 12+ caracteres, mayúsculas, minúsculas, números y símbolos.
      </p>

      {showConfirm && (
        <>
          <label className="block text-sm font-medium text-slate-700 dark:text-white/75">
            Confirmar contraseña
          </label>
          <input
            type={show ? 'text' : 'password'}
            value={confirmValue}
            onChange={(e) => onConfirmChange(e.target.value)}
            placeholder="Repetir contraseña"
            autoComplete="new-password"
            className={[
              inputConfirm,
              mismatch ? 'border-rose-400 dark:border-rose-400' : ''
            ].join(' ')}
          />
          {mismatch && (
            <p className="text-xs text-rose-600 dark:text-rose-300">
              Las contraseñas no coinciden.
            </p>
          )}
        </>
      )}
    </div>
  );
}
