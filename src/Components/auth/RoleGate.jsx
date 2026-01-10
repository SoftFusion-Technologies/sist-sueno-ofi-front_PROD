// src/Components/auth/RoleGate.jsx
// este componente es de uso global para hacer uso de los permisos por rol
import React, { useMemo } from 'react';
import { useAuth } from '../../AuthContext';

// Uso:
// <RoleGate allow={['socio','administrativo']}>
//   <button>...</button>
// </RoleGate>
export default function RoleGate({ allow = [], children, fallback = null }) {
  const { userLevel } = useAuth();

  const can = useMemo(() => {
    if (!allow?.length) return true; // si no pasás allow, permite
    const levels = Array.isArray(userLevel) ? userLevel : [userLevel];
    return levels.some((r) => allow.includes(r));
  }, [userLevel, allow]);

  return can ? <>{children}</> : fallback;
}
