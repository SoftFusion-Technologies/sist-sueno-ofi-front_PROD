import React, { useMemo } from 'react';

/*
 * Benjamin Orellana - 11/02/2026 - Se agrega paginación moderna para listado con meta.total/page/pageSize.
 */

const btnBase =
  'px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/10 hover:bg-white/90 dark:hover:bg-white/15 text-slate-900 dark:text-white text-sm font-extrabold';

const btnDisabled = 'opacity-50 pointer-events-none';

const buildPages = (page, totalPages) => {
  if (totalPages <= 7)
    return Array.from({ length: totalPages }, (_, i) => i + 1);

  const pages = new Set([1, totalPages, page, page - 1, page + 1]);
  const arr = [...pages]
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);

  const out = [];
  for (let i = 0; i < arr.length; i++) {
    const cur = arr[i];
    const prev = arr[i - 1];
    if (i > 0 && cur - prev > 1) out.push('…');
    out.push(cur);
  }
  return out;
};

export default function PaginationBar({ meta, onPageChange }) {
  const page = Number(meta?.page || 1);
  const pageSize = Number(meta?.pageSize || 20);
  const total = Number(meta?.total || 0);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const pages = useMemo(() => buildPages(page, totalPages), [page, totalPages]);

  return (
    <div className="rounded-3xl border border-black/10 dark:border-white/10 bg-white/75 dark:bg-white/10 backdrop-blur-xl shadow-xl p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="text-sm text-slate-700 dark:text-slate-200">
          Página <span className="font-extrabold">{page}</span> de{' '}
          <span className="font-extrabold">{totalPages}</span> · Total{' '}
          <span className="font-extrabold">{total}</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            className={`${btnBase} ${page <= 1 ? btnDisabled : ''}`}
            onClick={() => onPageChange?.(Math.max(1, page - 1))}
            type="button"
          >
            Anterior
          </button>

          {pages.map((p, idx) =>
            p === '…' ? (
              <span
                key={`e-${idx}`}
                className="px-2 text-slate-500 dark:text-slate-300"
              >
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange?.(p)}
                className={
                  p === page
                    ? 'px-3 py-2 rounded-xl bg-slate-900 text-white text-sm font-extrabold'
                    : btnBase
                }
              >
                {p}
              </button>
            )
          )}

          <button
            className={`${btnBase} ${page >= totalPages ? btnDisabled : ''}`}
            onClick={() => onPageChange?.(Math.min(totalPages, page + 1))}
            type="button"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
