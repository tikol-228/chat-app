
interface InputProps {
    type: string
    placeholder: any
    className: string
}


const Input = ({type, placeholder, className}:InputProps) => {

  return (
    <input type={type} placeholder={placeholder} className={className}/>
  )
}

export default Input