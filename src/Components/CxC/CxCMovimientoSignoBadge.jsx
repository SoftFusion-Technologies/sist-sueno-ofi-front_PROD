import React from 'react';
import { getMovimientoSignoMeta } from '../../utils/cxcFormatters';

const CxCMovimientoSignoBadge = ({ signo, className = '' }) => {
  const meta = getMovimientoSignoMeta(signo);

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

export default CxCMovimientoSignoBadge;
