'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ImportacionesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/importations');
  }, [router]);

  return (
    <div className="p-8 text-muted-foreground flex items-center justify-center min-h-[50vh]">
      <div className="flex items-center gap-3">
        <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span>Redirigiendo a Importaciones...</span>
      </div>
    </div>
  );
}
