import styles from './Kbd.module.css';

interface KbdProps {
  children: React.ReactNode;
  className?: string;
}

export function Kbd({ children, className }: KbdProps) {
  return <kbd className={`${styles.kbd}${className ? ` ${className}` : ''}`}>{children}</kbd>;
}
