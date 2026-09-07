export interface Contributor {
  login: string;
  avatarUrl: string;
}

/**
 * Kieu này nằm trong Redux store nên KHONG dùng `readonly`: Immer cần draft được no.
 * Bất biến được giữ bang reducer chu không bang kieu.
 */
export interface SourceFile {
  name: string;
  content: string;
  contributors: Contributor[] | undefined;
}

export function createFile(
  name: string,
  content: string,
  contributors?: Contributor[],
): SourceFile {
  return { name, content, contributors };
}
