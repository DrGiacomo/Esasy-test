export interface GitPushOptions {
  token: string;
  repoUrl: string;
  branch: string;
  filePath: string;
  content: string;
  commitMessage: string;
}

export interface GitPushResult {
  committed: boolean;
  commitUrl?: string;
}

/** Cliente de un proveedor Git. Crea/actualiza un archivo vía la API REST del proveedor. */
export interface GitProviderClient {
  pushFile(opts: GitPushOptions): Promise<GitPushResult>;
}
