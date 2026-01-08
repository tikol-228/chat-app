import React from 'react';

interface ButtonProps {
  onClick: () => void;
  label: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

const Button: React.FC<ButtonProps> = ({
  onClick,
  label,
  disabled = false,
  style,
  className,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={style}
      className={className}
    >
      {label}
    </button>
  );
};

export default Button;

// Usage example
// <Button label="call" className={styles.button} onClick={handleCall} />
