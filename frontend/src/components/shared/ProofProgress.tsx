import type { ProofState, ProofStage } from '../../types';

interface ProofProgressProps {
  state: ProofState;
}

const STAGES: { key: ProofStage; label: string }[] = [
  { key: 'computing_inputs', label: 'Computing merkle proof' },
  { key: 'generating_witness', label: 'Generating witness' },
  { key: 'proving', label: 'Building Groth16 proof' },
  { key: 'verifying', label: 'Verifying proof locally' },
  { key: 'submitting', label: 'Submitting to Solana' },
  { key: 'confirming', label: 'Confirming transaction' },
];

function getStageIndex(stage: ProofStage): number {
  return STAGES.findIndex(s => s.key === stage);
}

export function ProofProgress({ state }: ProofProgressProps) {
  const currentIndex = getStageIndex(state.stage);

  return (
    <div className="proof-progress">
      <div className="proof-steps">
        {STAGES.map((stage, i) => {
          let status: 'completed' | 'active' | 'pending' = 'pending';
          if (i < currentIndex) status = 'completed';
          else if (i === currentIndex) status = 'active';

          return (
            <div key={stage.key} className={`proof-step ${status}`}>
              <div className="proof-step-indicator">
                {status === 'completed' && (
                  <svg viewBox="0 0 16 16" fill="currentColor">
                    <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                  </svg>
                )}
                {status === 'active' && (
                  <span className="proof-step-spinner" />
                )}
                {status === 'pending' && (
                  <span className="proof-step-number">{i + 1}</span>
                )}
              </div>
              <span className="proof-step-label">{stage.label}</span>
            </div>
          );
        })}
      </div>

      <div className="proof-bar">
        <div
          className="proof-bar-fill"
          style={{ width: `${state.progress}%` }}
        />
      </div>

      <p className="proof-message">{state.message}</p>
    </div>
  );
}
