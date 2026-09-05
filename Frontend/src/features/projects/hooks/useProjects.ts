import { useState, useEffect, useCallback } from 'react';
import { projectsApi } from '../projects.api';
import type { Project } from '@/types/models';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Pide los proyectos. NO toca `loading` al empezar a proposito: en el montaje ya
   * vale `true`, asi que ponerlo otra vez solo provoca un render de mas — y hacerlo
   * de forma sincrona dentro de un efecto es justo lo que React desaconseja.
   */
  const cargar = useCallback(() => {
    projectsApi
      .getAll()
      .then(setProjects)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  /** Recargar a mano si vuelve a hacer falta el indicador de carga. */
  const refetch = useCallback(() => {
    setLoading(true);
    setError(null);
    cargar();
  }, [cargar]);

  return { projects, loading, error, refetch };
}
