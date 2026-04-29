type RestrictionModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  reasons: string[];
};

export const RestrictionModal = ({ open, onClose, title, reasons }: RestrictionModalProps) => {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-card">
        <h4>{title}</h4>
        <p className="helper">This activity is currently restricted due to the following reasons:</p>
        <ul className="restriction-list">
          {reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
        <div className="row">
          <button type="button" className="secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

