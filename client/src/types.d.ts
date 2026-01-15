declare module 'circomlibjs' {
  export interface PoseidonF {
    toString(x: any): string;
  }

  export interface Poseidon {
    F: PoseidonF;
    (inputs: (bigint | number | string)[]): any;
  }

  export function buildPoseidon(): Promise<Poseidon>;
}
