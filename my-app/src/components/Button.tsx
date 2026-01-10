import React from 'react'

interface ButtonProps {
  className?: string
  onClick?: React.MouseEventHandler<HTMLButtonElement>
  type?: "button" | "submit" | "reset"
  children: React.ReactNode
}

const Button: React.FC<ButtonProps> = ({ className, onClick, type = "button", children }) => {
  return (
    <button className={className} onClick={onClick} type={type}>
      {children}
    </button>
  )
}

export default Button
