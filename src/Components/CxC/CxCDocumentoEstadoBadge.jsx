import React from 'react';
import { getDocumentoEstadoMeta } from '../../utils/cxcFormatters';

const CxCDocumentoEstadoBadge = ({ documento, estado, className = '' }) => {
  const meta = getDocumentoEstadoMeta(documento || estado);

  return (
    <span
      className={[
        'inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold',
        meta.pillClass,
        className
      ].join(' ')}
    >
      <span className={['h-1.5 w-1.5 rounded-full', meta.dotClass].join(' ')} />
      {meta.label}
    </span>
  );
};

export default CxCDocumentoEstadoBadge;
