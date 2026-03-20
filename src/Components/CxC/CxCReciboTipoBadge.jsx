import React from 'react';
import { getReciboTipoMeta } from '../../utils/cxcFormatters';

const CxCReciboTipoBadge = ({ tipo, className = '' }) => {
  const meta = getReciboTipoMeta(tipo);

  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold',
        meta.pillClass,
        className
      ].join(' ')}
    >
      {meta.label}
    </span>
  );
};

export default CxCReciboTipoBadge;
