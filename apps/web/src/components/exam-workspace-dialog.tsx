'use client';
import { useEffect, useId, useRef, type ReactNode } from 'react';
export function WorkspaceDialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    id = useId(),
    close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const prior = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    return () => {
      if (prior?.isConnected) prior.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="logout-dialog exam-dialog"
      aria-labelledby={id}
      onCancel={(e) => {
        e.preventDefault();
        close.current();
      }}
    >
      <h2 id={id}>{title}</h2>
      {children}
    </dialog>
  );
}
